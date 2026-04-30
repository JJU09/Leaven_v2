SELECT policyname, pg_get_expr(with_check, polrelid) as with_check 
FROM pg_policies 
WHERE tablename = 'store_assets';
