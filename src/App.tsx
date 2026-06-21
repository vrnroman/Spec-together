import { useState } from "react";
import { useSession } from "./state/session";
import { Login } from "./components/Login";
import { RepoPicker } from "./components/RepoPicker";
import { FileTree } from "./components/FileTree";
import { FileViewer } from "./components/FileViewer";

export default function App() {
  const { token, user, repo, signOut, setRepo } = useSession();
  const [path, setPath] = useState<string | null>(null);

  if (!token) return <Login />;
  if (!repo) return <RepoPicker />;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Spec&#8209;together</div>
        <div className="repo-label">
          {repo.owner}/{repo.repo}
          <span className="muted small"> @ {repo.branch}</span>
        </div>
        <div className="spacer" />
        <button
          className="ghost"
          onClick={() => {
            setPath(null);
            setRepo(null);
          }}
        >
          Change repo
        </button>
        {user && (
          <span className="user">
            <img src={user.avatar_url} alt="" width={22} height={22} />
            {user.login}
          </span>
        )}
        <button className="ghost" onClick={signOut}>
          Sign out
        </button>
      </header>

      <div className="body">
        <aside className="sidebar">
          <FileTree repo={repo} selected={path} onSelect={setPath} />
        </aside>
        <main className="content">
          {path ? (
            <FileViewer repo={repo} path={path} />
          ) : (
            <div className="viewer-msg muted">
              Select a Markdown file to read and comment on it.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
