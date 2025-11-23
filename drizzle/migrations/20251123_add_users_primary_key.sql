DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_pkey'
          AND conrelid = 'users'::regclass
    ) THEN
        ALTER TABLE "users"
        ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
    END IF;
END $$;

