-- Verificar funciones existentes
SELECT proname, prosrc FROM pg_proc WHERE proname LIKE 'get_pending_matches%';

-- Verificar políticas de acceso
SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pet_matches';

-- Verificar datos en la tabla
SELECT * FROM public.pet_matches LIMIT 10;
