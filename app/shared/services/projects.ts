import { sql, session, ForbiddenError, NotFoundError, ValidationError } from "@elements/app";

export interface Project {
  id: string;
  name: string;
  dsnKey: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
}

export function isMemberOrThrow(projectId: string) {
  session.isLoggedInOrThrow();

  let member = !sql(`
    select 1 from projectMembers
     where projectId = ${projectId} and userId = ${session.getOrThrow("userId")}
  `).empty();

  if (!member) {
    throw new ForbiddenError("You are not a member of this project.");
  }
}

/** The project in the url, once the signed-in user is known to belong to it. */
export function projectOrThrow(projectId: string): Project {
  if (!/^[0-9a-f-]{36}$/.test(projectId)) {
    throw new NotFoundError("No such project.");
  }

  isMemberOrThrow(projectId);

  return sql<Project>(`select id, name, dsnKey from projects where id = ${projectId}`)
    .firstOrThrow("No such project.");
}

export function myProjects(): Project[] {
  return sql<Project>(`
    select p.id, p.name, p.dsnKey
      from projects p
      join projectMembers m on m.projectId = p.id
     where m.userId = ${session.getOrThrow("userId")}
     order by p.createdAt
  `).all();
}

export function membersOf(projectId: string): Member[] {
  return sql<Member>(`
    select u.id, u.name, u.email
      from users u
      join projectMembers m on m.userId = u.id
     where m.projectId = ${projectId}
     order by u.name
  `).all();
}

/** @rpc */
export function createProject(name: string): Project {
  session.isLoggedInOrThrow();

  let trimmed = name.trim();
  if (!trimmed) {
    throw new ValidationError("Give the project a name.");
  }

  let project = sql<Project>(`
    insert into projects (name) values (${trimmed}) returning id, name, dsnKey
  `).firstOrThrow();

  sql(`insert into projectMembers (projectId, userId) values (${project.id}, ${session.getOrThrow("userId")})`);

  return project;
}

/** @rpc */
export function addMember(projectId: string, email: string): Member {
  isMemberOrThrow(projectId);

  let user = sql<Member>(`select id, name, email from users where email = ${email.trim().toLowerCase()}`).first();
  if (!user) {
    throw new ValidationError("No account uses that email. Ask them to sign up first.");
  }

  sql(`
    insert into projectMembers (projectId, userId) values (${projectId}, ${user.id})
    on conflict (projectId, userId) do nothing
  `);

  return user;
}
