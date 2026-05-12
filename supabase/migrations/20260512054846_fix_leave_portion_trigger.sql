-- Create validation function for overlapping leaves (Fixing the Enum typo 'cancelled' -> 'canceled')
CREATE OR REPLACE FUNCTION check_overlapping_leave()
RETURNS TRIGGER AS $$
DECLARE
    conflict_portion TEXT;
BEGIN
    -- We only check if the new status is pending or approved. 
    -- If it's rejected or canceled, it doesn't occupy time.
    -- (Removed 'cancelled' as it is not a valid value for enum leave_status)
    IF NEW.status IN ('rejected', 'canceled') THEN
        RETURN NEW;
    END IF;

    -- Check for overlap with existing pending or approved requests
    -- Logic:
    -- If NEW.leave_portion = 'full', ANY overlap is a conflict.
    -- If NEW.leave_portion IN ('am', 'pm'), conflict if there's a 'full' overlap,
    -- or an overlap with the SAME portion ('am' with 'am', 'pm' with 'pm').

    SELECT leave_portion INTO conflict_portion
    FROM public.leave_requests
    WHERE member_id = NEW.member_id
      AND store_id = NEW.store_id
      AND status IN ('pending', 'approved')
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      -- Date overlap check: (StartA <= EndB) and (EndA >= StartB)
      AND start_date <= NEW.end_date
      AND end_date >= NEW.start_date
      -- Portion conflict logic
      AND (
          NEW.leave_portion = 'full' 
          OR leave_portion = 'full'
          OR NEW.leave_portion = leave_portion
      )
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION '해당 날짜에 이미 신청되거나 승인된 휴가(%)가 있습니다.', 
            CASE 
                WHEN conflict_portion = 'full' THEN '종일'
                WHEN conflict_portion = 'am' THEN '오전 반차'
                WHEN conflict_portion = 'pm' THEN '오후 반차'
                ELSE conflict_portion
            END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;