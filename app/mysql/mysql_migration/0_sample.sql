CREATE INDEX match_group_member_idx0 ON match_group_member (user_id);
CREATE INDEX user_idx0 ON user (entry_date ASC, kana ASC);
CREATE INDEX user_idx1 ON user (office_id);
CREATE INDEX user_idx2 ON user (mail);
ALTER TABLE user ADD FULLTEXT INDEX ngram_idx0 (goal) WITH PARSER ngram;
ALTER TABLE user ADD FULLTEXT INDEX ngram_idx1 (user_name) WITH PARSER ngram;

CREATE INDEX dept_role_member_idx0 ON department_role_member (role_id);
CREATE INDEX dept_role_member_idx1 ON department_role_member (user_id);

    -- "SELECT match_group_id FROM match_group_member WHERE user_id = ?",

CREATE INDEX match_group_idx0 ON match_group (match_group_name);
    -- "SELECT match_group_id, match_group_name, description, status, created_by, created_at FROM match_group WHERE match_group_id = ?";

CREATE INDEX session_idx0 ON `session` (linked_user_id);
-- "SELECT * FROM session WHERE session_id = ?" <== unecessary?? yes <= primary key

create index skill_idx0 ON skill (skill_name);

-- CREATE INDEX file_idx0 ON `file` (file_id); <= primary key
--     -- "SELECT file_name, path FROM file WHERE file_id = ?" 

-- CREATE INDEX office_idx0 ON office (office_id); <= primary key
-- -- `SELECT office_name FROM office WHERE office_id = ?`,



-- "INSERT INTO match_group (match_group_id, match_group_name, description, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)", <= not optimizable

-- "INSERT INTO match_group_member (match_group_id, user_id) VALUES (?, ?)" <= not optimizable

-- "INSERT INTO session (session_id, linked_user_id, created_at) VALUES (?, ?, ?)", <= not optimizable

-- "DELETE FROM session WHERE linked_user_id = ?" <== index already exists anyways

-- "SELECT user_id FROM user WHERE mail = ? AND password = ?", <= password is definitely NOT necessary

-- `SELECT user_id, user_name, office_id, user_icon_id FROM user ORDER BY entry_date ASC, kana ASC LIMIT ? OFFSET ?` <= already present

-- "SELECT user_id, user_name, office_id, user_icon_id FROM user WHERE user_id = ?", <= primary key

-- "SELECT user_id, user_name, kana, entry_date, office_id, user_icon_id FROM user WHERE user_id = ?", <= primary key

-- `SELECT department_id FROM department WHERE department_name LIKE ? AND active = true` <= too few so unecessary

-- `SELECT user_id FROM department_role_member WHERE department_id IN (?) AND belong = true` <= first element in primary key

--  `SELECT role_id FROM role WHERE role_name LIKE ? AND active = true`, <= too few so unecessary
-- `SELECT user_id FROM department_role_member WHERE role_id IN (?) AND belong = true`

-- `SELECT office_id FROM office WHERE office_name LIKE ?`, <= too few so unecessary

-- `SELECT user_id FROM user WHERE office_id IN (?)` <= already present

-- `SELECT skill_id FROM skill WHERE skill_name LIKE ?` <= too few so unecessary

-- `SELECT user_id FROM skill_member WHERE skill_id IN (?)` <= primary key

-- `SELECT department_name FROM department WHERE department_id = (SELECT department_id FROM department_role_member WHERE user_id = ? AND belong = true)`, <= BYE

-- `SELECT skill_name FROM skill WHERE skill_id IN (SELECT skill_id FROM skill_member WHERE user_id = ?)`, <= BYE
