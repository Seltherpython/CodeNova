import { Octokit } from "octokit";
import fetch from "node-fetch";
import gunzip from "gunzip-maybe";
import tar from "tar-stream";
import { Readable } from "stream";

// Default public client
const defaultOctokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export interface IngestedFile {
  path: string;
  content: string;
}

export interface IngestionResult {
  repoName: string;
  files: IngestedFile[];
  unifiedContent: string;
}

const EXCLUDED_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.pdf', '.zip', '.gz', '.tar', '.exe', '.dll', '.bin',
  '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.webm', '.map', '.pyc', '.pyo', '.pyd', '.db', '.sqlite'
];

const EXCLUDED_DIRECTORIES = [
  'node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage', '.vscode', '.idea', 'vendor', '__pycache__', 'venv', 'env'
];

/**
 * High-performance repository ingestion using streaming tarballs.
 * This method bypasses individual file-fetch rate limits, allowing for 
 * "unlimited" file ingestion in a single network request.
 */
export async function ingestRepo(owner: string, repo: string, userToken?: string): Promise<IngestionResult> {
  const token = userToken || process.env.GITHUB_TOKEN;
  
  // 1. Get the tarball URL
  const tarballUrl = `https://api.github.com/repos/${owner}/${repo}/tarball`;
  
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'Repodata-Discovery-Engine/4.8',
  };
  
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const response = await fetch(tarballUrl, { headers });
  
  if (!response.ok) {
    throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
  }

  const files: IngestedFile[] = [];
  const extract = tar.extract();

  return new Promise((resolve, reject) => {
    extract.on('entry', (header, stream, next) => {
      const chunks: any[] = [];
      const isFile = header.type === 'file';
      
      // Clean up the path (GitHub prefixes with repo-branch-sha)
      const rawPath = header.name;
      const cleanPath = rawPath.split('/').slice(1).join('/');

      // Filters
      const isExcludedDir = EXCLUDED_DIRECTORIES.some(dir => cleanPath.split('/').includes(dir));
      const isExcludedExt = EXCLUDED_EXTENSIONS.some(ext => cleanPath.toLowerCase().endsWith(ext));
      const isTooBig = (header.size || 0) > 250000; // 250KB limit

      if (isFile && cleanPath && !isExcludedDir && !isExcludedExt && !isTooBig) {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => {
          const content = Buffer.concat(chunks).toString('utf-8');
          files.push({ path: cleanPath, content });
          next();
        });
      } else {
        stream.resume(); // Skip entry
        next();
      }
    });

    extract.on('finish', () => {
      // Sort by path for consistency
      files.sort((a, b) => a.path.localeCompare(b.path));
      
      // Limit to 600 files to keep context manageable but comprehensive
      const finalFiles = files.slice(0, 600);
      
      const unifiedContent = finalFiles
        .map(file => `[FILE: ${file.path}]\n${file.content}\n[EOF]`)
        .join('\n\n');

      resolve({
        repoName: `${owner}/${repo}`,
        files: finalFiles,
        unifiedContent
      });
    });

    extract.on('error', reject);

    // Stream: Response -> Gunzip -> Tar Extract
    (response.body as any).pipe(gunzip()).pipe(extract);
  });
}

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const regex = /^(https?:\/\/)?(www\.)?github\.com\/([^/]+)\/([^/]+)/;
    const match = url.match(regex);
    if (match) {
      return {
        owner: match[3],
        repo: match[4].split(/[?#]/)[0].replace('.git', ''),
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}
