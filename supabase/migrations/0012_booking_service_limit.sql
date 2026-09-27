CREATE OR REPLACE FUNCTION check_customer_active_bookings_limit()
RETURNS TRIGGER AS $$
DECLARE
  active_count INTEGER;
BEGIN
  SELECT count(*) INTO active_count
  FROM bookings
  WHERE customer_id = NEW.customer_id
    AND status IN ('pending', 'confirmed', 'in_progress');

  IF active_count >= 2 THEN
    RAISE EXCEPTION 'Customer has reached the maximum limit of 2 active services. Please complete or cancel an existing service before starting a new one.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_booking_limit_trigger
BEFORE INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION check_customer_active_bookings_limit();