-- Create default Person records for the default PM, Director, and User
INSERT INTO "Person" (id, "firstName", "lastName", "primaryEmail", "createdAt", "updatedAt") 
VALUES 
  ('default-pm-person-id', 'Default', 'Program Manager', 'pm@government.gov', NOW(), NOW()),
  ('default-director-person-id', 'Default', 'Director', 'director@government.gov', NOW(), NOW()),
  ('default-user-person-id', 'Default', 'User', 'user@government.gov', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create default User records
INSERT INTO "User" (id, "personId", "username", "keycloakId", "roles", "accountStatus", "emailVerified", "createdAt", "updatedAt") 
VALUES 
  ('default-pm-id', 'default-pm-person-id', 'default-pm', 'default-pm-keycloak', '["pm"]'::jsonb, 'ACTIVE'::"AccountStatus", true, NOW(), NOW()),
  ('default-director-id', 'default-director-person-id', 'default-director', 'default-director-keycloak', '["director"]'::jsonb, 'ACTIVE'::"AccountStatus", true, NOW(), NOW()),
  ('default-user-id', 'default-user-person-id', 'default-user', 'default-user-keycloak', '["user"]'::jsonb, 'ACTIVE'::"AccountStatus", true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;