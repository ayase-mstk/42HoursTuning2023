CREATE INDEX user_idx0 ON user (entry_date ASC, kana ASC);
CREATE INDEX user_idx1 ON user (office_id);
CREATE INDEX user_idx2 ON user (mail);
ALTER TABLE user ADD FULLTEXT INDEX ngram_idx0 (goal) WITH PARSER ngram;
ALTER TABLE user ADD FULLTEXT INDEX ngram_idx1 (user_name) WITH PARSER ngram;

CREATE INDEX dept_role_member_idx0 ON department_role_member (role_id);
CREATE INDEX dept_role_member_idx1 ON department_role_member (user_id);

CREATE INDEX match_group_member_idx0 ON match_group_member (user_id);

CREATE INDEX match_groupidx0 ON match_group (match_group_name);

CREATE INDEX sessionidx0 ON `session` (linked_user_id);

-- create table user_count (
--     count int not null
-- );
-- insert into user_count (count) values ((select count(user_id) from user));
