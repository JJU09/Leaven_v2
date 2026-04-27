CREATE OR REPLACE FUNCTION create_unassigned_role_if_not_exists(p_store_id uuid)
RETURNS uuid AS $$
DECLARE
    v_role_id uuid;
BEGIN
    -- '미지정' 직급이 이미 있는지 확인
    SELECT id INTO v_role_id
    FROM store_roles
    WHERE store_id = p_store_id AND name = '미지정'
    LIMIT 1;

    -- 없다면 생성
    IF v_role_id IS NULL THEN
        INSERT INTO store_roles (
            store_id, 
            name, 
            color, 
            is_system, 
            hierarchy_level, 
            permissions
        ) VALUES (
            p_store_id, 
            '미지정', 
            '#cbd5e1', 
            true, 
            -1, 
            '[]'::jsonb
        ) RETURNING id INTO v_role_id;
    END IF;

    RETURN v_role_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;