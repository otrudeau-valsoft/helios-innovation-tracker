-- Add Hudson as a company
INSERT INTO companies (id, name, slug)
VALUES (gen_random_uuid(), 'Hudson', 'hudson')
ON CONFLICT (slug) DO NOTHING;
