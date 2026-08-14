SELECT cron.schedule(
  'poll-pending-heygen-videos',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://eqikeuqwbphwongtfzhe.supabase.co/functions/v1/poll-heygen-status-batch',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxaWtldXF3YnBod29uZ3RmemhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDU3MjgsImV4cCI6MjA3MzkyMTcyOH0.OTmxqFKhXiHcEKoV0uuRCvhmkHkKGHNo-n7qpl_tW1Y"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);