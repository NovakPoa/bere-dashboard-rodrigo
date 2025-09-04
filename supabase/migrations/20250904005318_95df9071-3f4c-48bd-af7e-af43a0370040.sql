-- Add unique constraint to prevent duplicate garmin activities
ALTER TABLE garmin_activities 
ADD CONSTRAINT unique_terra_payload_id UNIQUE (terra_payload_id);