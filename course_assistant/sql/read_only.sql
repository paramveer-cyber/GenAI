CREATE ROLE course_assistant_readonly WITH LOGIN PASSWORD '*hjytd$a65%8vhj!';
GRANT CONNECT ON DATABASE course_assistant TO course_assistant_readonly;
GRANT SELECT ON chunks TO course_assistant_readonly;