import { createHash } from "crypto";

export interface SessionDependencies {
    method: string;
    message_id: number;
    cid: string;
    at: number;
}

class ActionSession {
    action_sessions: Map<string, SessionDependencies> = new Map<string, SessionDependencies>();

    async createSession(dependencies: SessionDependencies): Promise<string> {
        const new_hash = createHash("md5").update("hx").digest("hex").slice(0, 16);
        this.action_sessions.set(new_hash, dependencies);
        return new Promise((res) => {res(new_hash)});
    }

    async removeSession(session_hash: string): Promise<void> {
        if (this.action_sessions.has(session_hash)) this.action_sessions.delete(session_hash);
    }

    async getSession(session_hash: string): Promise<SessionDependencies | null> {
        return this.action_sessions.get(session_hash) ?? null;
    }

    async getAllSessions(): Promise<Map<string, SessionDependencies>> {
        return this.action_sessions;
    }
}


export const actionSession = new ActionSession();