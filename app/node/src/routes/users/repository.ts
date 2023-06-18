import { RowDataPacket } from "mysql2";
import pool from "../../util/mysql";
import {
  MatchGroupConfig,
  SearchedUser,
  User,
  UserForFilter,
  // MatchGroupConfig,
} from "../../model/types";
import {
  convertToSearchedUser,
  convertToUserForFilter,
  convertToUsers,
} from "../../model/utils";

export const getUserIdByMailAndPassword = async (
  mail: string,
  hashPassword: string
): Promise<string | undefined> => {
  const [user] = await pool.query<RowDataPacket[]>(
    "SELECT user_id FROM user WHERE mail = ? AND password = ?",
    [mail, hashPassword]
  );
  if (user.length === 0) {
    return;
  }

  return user[0].user_id;
};

export const getUsers = async (
  limit: number,
  offset: number
): Promise<User[]> => {
  const query = `
SELECT
  u.user_id AS user_id,
  u.user_name AS user_name,
  u.office_id AS office_id,
  u.user_icon_id AS user_icon_id,
  f.file_name AS file_name,
  o.office_name AS office_name
FROM user AS u
  INNER JOIN office AS o ON u.office_id = o.office_id
  INNER JOIN file AS f ON u.user_icon_id = f.file_id
ORDER BY entry_date ASC, kana ASC
LIMIT ? OFFSET ?
`;
  let rows: RowDataPacket[] = [];
  [rows] = await pool.query<RowDataPacket[]>(query, [limit, offset]);

  // const query = `SELECT user_id, user_name, office_id, user_icon_id FROM user ORDER BY entry_date ASC, kana ASC LIMIT ? OFFSET ?`;
  // const rows: RowDataPacket[] = [];

  // const [userRows] = await pool.query<RowDataPacket[]>(query, [limit, offset]);
  // for (const userRow of userRows) {
  //   const [officeRows] = await pool.query<RowDataPacket[]>(
  //     `SELECT office_name FROM office WHERE office_id = ?`,
  //     [userRow.office_id]
  //   );
  //   const [fileRows] = await pool.query<RowDataPacket[]>(
  //     `SELECT file_name FROM file WHERE file_id = ?`,
  //     [userRow.user_icon_id]
  //   );
  //   userRow.office_name = officeRows[0].office_name;
  //   userRow.file_name = fileRows[0].file_name;
  //   rows.push(userRow);
  // }

  return convertToUsers(rows);
};

export const getUserByUserId = async (
  userId: string
): Promise<User | undefined> => {
  const [user] = await pool.query<RowDataPacket[]>(
    "SELECT user_id, user_name, office_id, user_icon_id FROM user WHERE user_id = ?",
    [userId]
  );
  if (user.length === 0) {
    return;
  }

  const [office] = await pool.query<RowDataPacket[]>(
    `SELECT office_name FROM office WHERE office_id = ?`,
    [user[0].office_id]
  );
  const [file] = await pool.query<RowDataPacket[]>(
    `SELECT file_name FROM file WHERE file_id = ?`,
    [user[0].user_icon_id]
  );

  return {
    userId: user[0].user_id,
    userName: user[0].user_name,
    userIcon: {
      fileId: user[0].user_icon_id,
      fileName: file[0].file_name,
    },
    officeName: office[0].office_name,
  };
};

export const getUsersByUserIds = async (
  userIds: string[]
): Promise<SearchedUser[]> => {
  let users: SearchedUser[] = [];
  for (const userId of userIds) {
    const [userRows] = await pool.query<RowDataPacket[]>(
      "SELECT user_id, user_name, kana, entry_date, office_id, user_icon_id FROM user WHERE user_id = ?",
      [userId]
    );
    if (userRows.length === 0) {
      continue;
    }

    const [officeRows] = await pool.query<RowDataPacket[]>(
      `SELECT office_name FROM office WHERE office_id = ?`,
      [userRows[0].office_id]
    );
    const [fileRows] = await pool.query<RowDataPacket[]>(
      `SELECT file_name FROM file WHERE file_id = ?`,
      [userRows[0].user_icon_id]
    );
    userRows[0].office_name = officeRows[0].office_name;
    userRows[0].file_name = fileRows[0].file_name;

    users = users.concat(convertToSearchedUser(userRows));
  }
  return users;
};

export const getUsersByUserName = async (
  userName: string
): Promise<SearchedUser[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    // `SELECT user_id FROM user WHERE user_name LIKE ?`,
    // [`%${userName}%`]
    `SELECT user_id FROM user WHERE MATCH(user_name) AGAINST(? IN BOOLEAN MODE)`,
    [userName]
  );
  const userIds: string[] = rows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUsersByKana = async (kana: string): Promise<SearchedUser[]> => {
  const isKana = (kana: string): boolean => {
    const kanaRegex = /^[\u3040-\u3096\u30A0-\u30FF\u31F0-\u31FFー　]*$/;
    return kanaRegex.test(kana);
  };

  if (!isKana(kana)) {
    return [];
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM user WHERE kana LIKE ?`,
    [`%${kana}%`]
  );
  const userIds: string[] = rows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUsersByMail = async (mail: string): Promise<SearchedUser[]> => {
  const isValidEmailChar = (keyword: string): boolean => {
    const allowedChars = "popy0123456789@example.com";
    const regex = new RegExp(`^[${allowedChars}]+$`);
    return regex.test(keyword);
  };
  if (!isValidEmailChar(mail)) return [];
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM user WHERE mail LIKE ?`,
    [`%${mail}%`]
  );
  const userIds: string[] = rows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUsersByDepartmentName = async (
  departmentName: string
): Promise<SearchedUser[]> => {
  const [departmentIdRows] = await pool.query<RowDataPacket[]>(
    `SELECT department_id FROM department WHERE department_name LIKE ? AND active = true`,
    [`%${departmentName}%`]
  );
  const departmentIds: string[] = departmentIdRows.map(
    (row) => row.department_id
  );
  if (departmentIds.length === 0) {
    return [];
  }

  const [userIdRows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM department_role_member WHERE department_id IN (?) AND belong = true`,
    [departmentIds]
  );
  const userIds: string[] = userIdRows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUsersByRoleName = async (
  roleName: string
): Promise<SearchedUser[]> => {
  const [roleIdRows] = await pool.query<RowDataPacket[]>(
    `SELECT role_id FROM role WHERE role_name LIKE ? AND active = true`,
    [`%${roleName}%`]
  );
  const roleIds: string[] = roleIdRows.map((row) => row.role_id);
  if (roleIds.length === 0) {
    return [];
  }

  const [userIdRows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM department_role_member WHERE role_id IN (?) AND belong = true`,
    [roleIds]
  );
  const userIds: string[] = userIdRows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUsersByOfficeName = async (
  officeName: string
): Promise<SearchedUser[]> => {
  const [officeIdRows] = await pool.query<RowDataPacket[]>(
    `SELECT office_id FROM office WHERE office_name LIKE ?`,
    [`%${officeName}%`]
  );
  const officeIds: string[] = officeIdRows.map((row) => row.office_id);
  if (officeIds.length === 0) {
    return [];
  }

  const [userIdRows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM user WHERE office_id IN (?)`,
    [officeIds]
  );
  const userIds: string[] = userIdRows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUsersBySkillName = async (
  skillName: string
): Promise<SearchedUser[]> => {
  const [skillIdRows] = await pool.query<RowDataPacket[]>(
    `SELECT skill_id FROM skill WHERE skill_name LIKE ?`,
    [`%${skillName}%`]
  );
  const skillIds: string[] = skillIdRows.map((row) => row.skill_id);
  if (skillIds.length === 0) {
    return [];
  }

  const [userIdRows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM skill_member WHERE skill_id IN (?)`,
    [skillIds]
  );
  const userIds: string[] = userIdRows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUsersByGoal = async (goal: string): Promise<SearchedUser[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    // `SELECT user_id FROM user WHERE goal LIKE ?`,
    // [`%${goal}%`]
    `SELECT user_id FROM user WHERE MATCH(goal) AGAINST(? IN BOOLEAN MODE)`,
    [goal]
  );
  const userIds: string[] = rows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUserForFilter = async (
  userId?: string
): Promise<UserForFilter> => {
  let userRows: RowDataPacket[];
  if (!userId) {
    const randomEmail = `popy${Math.floor(Math.random() * 300001)}@example.com`;
    [userRows] = await pool.query<RowDataPacket[]>(
      `SELECT user_id, user_name, office_id, user_icon_id FROM user WHERE mail = ?`,
      [randomEmail]
    );
  } else {
    [userRows] = await pool.query<RowDataPacket[]>(
      "SELECT user_id, user_name, office_id, user_icon_id FROM user WHERE user_id = ?",
      [userId]
    );
  }
  const user = userRows[0];

  const [officeNameRow] = await pool.query<RowDataPacket[]>(
    `SELECT office_name FROM office WHERE office_id = ?`,
    [user.office_id]
  );
  const [fileNameRow] = await pool.query<RowDataPacket[]>(
    `SELECT file_name FROM file WHERE file_id = ?`,
    [user.user_icon_id]
  );
  const [departmentNameRow] = await pool.query<RowDataPacket[]>(
    `SELECT department_name FROM department WHERE department_id = (SELECT department_id FROM department_role_member WHERE user_id = ? AND belong = true)`,
    [user.user_id]
  );
  const [skillNameRows] = await pool.query<RowDataPacket[]>(
    `SELECT skill_name FROM skill WHERE skill_id IN (SELECT skill_id FROM skill_member WHERE user_id = ?)`,
    [user.user_id]
  );

  user.office_name = officeNameRow[0].office_name;
  user.file_name = fileNameRow[0].file_name;
  user.department_name = departmentNameRow[0].department_name;
  user.skill_names = skillNameRows.map((row) => row.skill_name);

  return convertToUserForFilter(user);
};

export const getUsersByIds = async (userIds: string[]): Promise<User[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
      u.user_id AS user_id,
      u.user_name AS user_name,
      u.user_icon_id AS user_icon_id,
      f.file_name AS file_name,
      o.office_name AS office_name
    FROM user AS u
      INNER JOIN office AS o ON u.office_id = o.office_id
      INNER JOIN file AS f ON u.user_icon_id = f.file_id
    WHERE user_id IN (?)`,
    [userIds]
  );

  return convertToUsers(rows);
};

export const getUserIdsForFilterV2 = async (
  matchGroupConfig: MatchGroupConfig,
  owner: UserForFilter
): Promise<string[]> => {
  let rows: RowDataPacket[];

  [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
      department_id
    FROM department
    WHERE department_name = ?
    `,
    [owner.departmentName]
  );
  const departmentId = rows[0].department_id;

  [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
      office_id
    FROM user
    WHERE user_id = ?
    `,
    [owner.userId]
  );
  const officeId = rows[0].office_id;

  let skillIds: string[] = [];
  if (matchGroupConfig.skillFilter.length > 0) {
    [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        skill_id
      FROM skill
      WHERE skill_name IN (?)
      `,
      [matchGroupConfig.skillFilter]
    );
    skillIds = rows.map((row) => row.skill_id);
  }

  let exceptUserIds: string[] = [];
  if (matchGroupConfig.neverMatchedFilter) {
    [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        user_id
      FROM match_group_member
      WHERE match_group_id IN (SELECT match_group_id FROM match_group_member WHERE user_id = ?)
      `,
      [owner.userId]
    );
    exceptUserIds = rows.map((row) => row.user_id);
  }
  exceptUserIds.push(owner.userId);

  const query = `
SELECT
  u.user_id as user_id
FROM user as u
  ${
    matchGroupConfig.departmentFilter === "onlyMyDepartment"
      ? `INNER JOIN department_role_member AS drm ON u.user_id = drm.user_id AND drm.department_id = '${departmentId}' AND drm.belong = true`
      : matchGroupConfig.departmentFilter === "excludeMyDepartment"
      ? `INNER JOIN department_role_member AS drm ON u.user_id = drm.user_id AND drm.department_id != '${departmentId}' AND drm.belong = true`
      : ""
  }
  ${
    matchGroupConfig.skillFilter.length > 0
      ? `INNER JOIN skill_member AS sm ON u.user_id = sm.user_id AND sm.skill_id IN ( ${skillIds
          .map((id) => `'${id}'`)
          .join(",")} )`
      : ""
  }
WHERE
  1=1
  AND ${
    matchGroupConfig.officeFilter === "onlyMyOffice"
      ? `u.office_id = '${officeId}'`
      : matchGroupConfig.officeFilter === "excludeMyOffice"
      ? `u.office_id != '${officeId}'`
      : "1=1"
  }
  AND ${
    exceptUserIds.length > 0
      ? `u.user_id NOT IN ( ${exceptUserIds.map((id) => `'${id}'`).join(",")} )`
      : "1=1"
  }
  `;

  [rows] = await pool.query<RowDataPacket[]>(query);
  let userIds = rows.map((row) => row.user_id);

  const num = matchGroupConfig.numOfMembers - 1;
  if (userIds.length > num) {
    let newUserIds: string[] = [];
    for (let i = 0; i < num; i++) {
      const index = Math.floor(Math.random() * (userIds.length - i));
      newUserIds.push(userIds[index]);
      userIds.splice(index, userIds.length - i - 1);
    }
    userIds = newUserIds;
  }
  userIds.push(owner.userId);
  return userIds;
};

export const getUsersForFilterV2 =
  async (): // matchGroupConfig: MatchGroupConfig
  Promise<UserForFilter[]> => {
    // let userRows: RowDataPacket[];

    // const [userIdsRow] = await pool.query<RowDataPacket[]>(
    //   `SELECT
    //     user
    //   `

    // const [userIdsByDepartmentFilterRows] = await pool.query<RowDataPacket[]>(
    //   `SELECT
    //     drm.user_id as user_id
    //   FROM department as d
    //     INNER JOIN department_role_member as drm ON d.department_id = drm.department_id
    //   WHERE d.department_name = ?`
    // );

    // const [userIdsBySkillFilterRows] = await pool.query<RowDataPacket[]>(
    //   `SELECT
    //     sm.user_id as user_id
    //   FROM skill AS s
    //     INNER JOIN skill_member AS sm ON s.skill_id = sm.skill_id
    //   WHERE s.skill_name IN (?)`,
    //   [matchGroupConfig.skillFilter]
    // );

    // if (!userId) {
    //   const randomEmail = `popy${Math.floor(Math.random() * 300001)}@example.com`;
    //   [userRows] = await pool.query<RowDataPacket[]>(
    //     `SELECT user_id, user_name, office_id, user_icon_id FROM user WHERE mail = ?`,
    //     [randomEmail]
    //   );
    // } else {
    //   [userRows] = await pool.query<RowDataPacket[]>(
    //     "SELECT user_id, user_name, office_id, user_icon_id FROM user WHERE user_id = ?",
    //     [userId]
    //   );
    // }
    // const user = userRows[0];

    // const [officeNameRow] = await pool.query<RowDataPacket[]>(
    //   `SELECT office_name FROM office WHERE office_id = ?`,
    //   [user.office_id]
    // );
    // const [fileNameRow] = await pool.query<RowDataPacket[]>(
    //   `SELECT file_name FROM file WHERE file_id = ?`,
    //   [user.user_icon_id]
    // );
    // const [departmentNameRow] = await pool.query<RowDataPacket[]>(
    //   `SELECT department_name FROM department WHERE department_id = (SELECT department_id FROM department_role_member WHERE user_id = ? AND belong = true)`,
    //   [user.user_id]
    // );
    // const [skillNameRows] = await pool.query<RowDataPacket[]>(
    //   `SELECT skill_name FROM skill WHERE skill_id IN (SELECT skill_id FROM skill_member WHERE user_id = ?)`,
    //   [user.user_id]
    // );

    // user.office_name = officeNameRow[0].office_name;
    // user.file_name = fileNameRow[0].file_name;
    // user.department_name = departmentNameRow[0].department_name;
    // user.skill_names = skillNameRows.map((row) => row.skill_name);

    return [];
  };
