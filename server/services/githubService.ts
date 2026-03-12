import { Octokit } from "octokit";

// Default public client (falls back to ENV token for higher limits if provided)
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
  summary?: string;
}

const EXCLUDED_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.pdf', '.zip', '.gz', '.tar', '.exe', '.dll', '.bin',
  '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.webm', '.map', '.pyc', '.pyo', '.pyd', '.db', '.sqlite'
];

const EXCLUDED_DIRECTORIES = [
  'node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage', '.vscode', '.idea', 'vendor', '__pycache__', 'venv', 'env'
];

export async function ingestRepo(owner: string, repo: string, userToken?: string): Promise<IngestionResult> {
  const octokit = userToken ? new Octokit({ auth: userToken }) : defaultOctokit;

  if (!process.env.GITHUB_TOKEN && !userToken) {
    console.warn("⚠️ GITHUB_TOKEN and User Token missing. Rate limits will be extremely restricted.");
  }

  // 1. Get the latest commit to find the tree SHA (usually 'main' or 'master')
  const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
  const defaultBranch = repoData.default_branch;

  // 2. Get the entire repository tree in ONE request
  const { data: treeData } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: defaultBranch,
    recursive: "true",
  });

  const files: IngestedFile[] = [];
  
  // 3. Filter and fetch files (Limit concurrency to avoid flooding)
  const filteredItems = treeData.tree.filter(item => 
    item.type === 'blob' && 
    !EXCLUDED_DIRECTORIES.some(dir => item.path?.split('/').includes(dir)) &&
    !EXCLUDED_EXTENSIONS.some(ext => item.path?.toLowerCase().endsWith(ext))
  );

  // Take only first 300 files to stay safe for LLM context and API limits
  const targetItems = filteredItems.slice(0, 300);

  await Promise.all(targetItems.map(async (item) => {
    try {
      const { data: fileData } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: item.path || '',
      });

      if ('content' in fileData && typeof fileData.content === 'string') {
        const decodedContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
        files.push({
          path: item.path || 'unknown',
          content: decodedContent,
        });
      }
    } catch (err) {
      console.error(`Error fetching file ${item.path}:`, err);
    }
  }));

  files.sort((a, b) => a.path.localeCompare(b.path));

  const unifiedContent = files
    .map(file => `--- FILE: ${file.path} ---\n${file.content}\n--- END FILE: ${file.path} ---\n`)
    .join('\n');

  return {
    repoName: `${owner}/${repo}`,
    files,
    unifiedContent,
  };
}

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    // Strictly anchor to github.com to prevent spoofing
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
