DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can send broadcasts" ON realtime.messages;

CREATE POLICY "Users can receive only own-scoped broadcasts"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (
    realtime.topic() LIKE ('user:' || auth.uid()::text || '%')
    OR realtime.topic() LIKE ('notifications:' || auth.uid()::text || '%')
  );

CREATE POLICY "Users can send only own-scoped broadcasts"
  ON realtime.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    realtime.topic() LIKE ('user:' || auth.uid()::text || '%')
    OR realtime.topic() LIKE ('notifications:' || auth.uid()::text || '%')
  );