CREATE INDEX user_idx0 ON user (entry_date ASC, kana ASC);
CREATE INDEX user_idx1 ON user (office_id);
CREATE INDEX user_idx2 ON user (mail, password);

CREATE INDEX dept_role_member_idx0 ON department_role_member (role_id);
CREATE INDEX dept_role_member_idx1 ON department_role_member (user_id);

CREATE INDEX match_group_member_idx0 ON match_group_member (user_id);

