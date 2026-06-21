import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { GitHubClient } from "../github/client";
import { resolveHost } from "../github/host";
import type { GitHubUser, RepoRef } from "../types";

const TOKEN_KEY = "spec-together:token";
const REPO_KEY = "spec-together:repo";
const HOST_KEY = "spec-together:host";

interface SessionValue {
  token: string | null;
  user: GitHubUser | null;
  client: GitHubClient | null;
  repo: RepoRef | null;
  /** Bare GitHub Enterprise host, or "" for public github.com. */
  host: string;
  /** Web UI root for the active host (for links back to GitHub). */
  webBaseUrl: string;
  signIn: (token: string, user: GitHubUser, host?: string) => void;
  signOut: () => void;
  setRepo: (repo: RepoRef | null) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

function loadRepo(): RepoRef | null {
  try {
    const raw = localStorage.getItem(REPO_KEY);
    return raw ? (JSON.parse(raw) as RepoRef) : null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );
  const [host, setHost] = useState<string>(
    () => localStorage.getItem(HOST_KEY) ?? "",
  );
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [repo, setRepoState] = useState<RepoRef | null>(loadRepo);

  const resolved = useMemo(() => resolveHost(host), [host]);

  const client = useMemo(
    () => (token ? new GitHubClient(token, resolved.api) : null),
    [token, resolved.api],
  );

  // If we have a stored token but no user yet (page reload), re-validate it.
  useEffect(() => {
    if (!client || user) return;
    let cancelled = false;
    client
      .get<GitHubUser>("/user")
      .then((u) => !cancelled && setUser(u))
      .catch(() => {
        // Token is bad/expired — clear it so the user re-enters one.
        if (!cancelled) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [client, user]);

  const value: SessionValue = {
    token,
    user,
    client,
    repo,
    host,
    webBaseUrl: resolved.web,
    signIn: (newToken, newUser, newHost = "") => {
      localStorage.setItem(TOKEN_KEY, newToken);
      if (newHost) localStorage.setItem(HOST_KEY, newHost);
      else localStorage.removeItem(HOST_KEY);
      setToken(newToken);
      setHost(newHost);
      setUser(newUser);
    },
    signOut: () => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(HOST_KEY);
      setToken(null);
      setHost("");
      setUser(null);
    },
    setRepo: (newRepo) => {
      if (newRepo) localStorage.setItem(REPO_KEY, JSON.stringify(newRepo));
      else localStorage.removeItem(REPO_KEY);
      setRepoState(newRepo);
    },
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
