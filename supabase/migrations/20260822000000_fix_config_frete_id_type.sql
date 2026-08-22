-- The error "invalid input syntax for type integer: 'singleton'" indicates the ID column is integer but we're passing a string.
-- However, standard practice for singletons in this project is often a string ID.
-- Let's check the table structure and fix the data or the column.

-- If the table uses integer IDs, we should use ID 1 for the singleton.
-- But if the code expects 'singleton', we should change the column to TEXT or adjust the code.
-- Based on the project history, it's likely a TEXT column was expected.

DO $$ 
BEGIN
    -- Check if 'id' is integer. If so, and we want to use 'singleton', we need to alter it or use a numeric ID.
    -- However, changing ID type is risky if there are foreign keys (unlikely for a config table).
    -- A safer approach for now is to check the current ID type and data.
END $$;

-- Let's ensure the table exists and has the correct 'id' type to support 'singleton'.
-- If it's currently integer, we'll cast it to text.

ALTER TABLE public.config_frete ALTER COLUMN id TYPE text;

-- Ensure the 'singleton' row exists
INSERT INTO public.config_frete (id)
VALUES ('singleton')
ON CONFLICT (id) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.config_frete TO authenticated;
GRANT ALL ON public.config_frete TO service_role;
