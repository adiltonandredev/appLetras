-- ============================================================
-- seed.sql — Dados iniciais do Repertório Litúrgico
-- Execute após as migrations
-- ============================================================

-- ─── Roles ───────────────────────────────────────────────────
INSERT INTO public.roles (name, label, description, level) VALUES
  ('padrao',        'Usuário Padrão',        'Acesso básico: visualizar músicas, criar repertórios', 1),
  ('intermediario', 'Usuário Intermediário', 'Pode cadastrar músicas (sujeitas à aprovação)',          2),
  ('master',        'Usuário Master',        'Gerencia conteúdo, categorias e usuários de nível inferior', 3),
  ('administrador', 'Administrador',         'Acesso total ao sistema',                               4)
ON CONFLICT (name) DO NOTHING;

-- ─── Permissions ─────────────────────────────────────────────
INSERT INTO public.permissions (code, description, module) VALUES
  -- Songs
  ('songs:view',         'Visualizar músicas aprovadas',          'songs'),
  ('songs:create',       'Criar novas músicas',                   'songs'),
  ('songs:edit:own',     'Editar próprias músicas',               'songs'),
  ('songs:edit:any',     'Editar qualquer música',                'songs'),
  ('songs:approve',      'Aprovar ou reprovar músicas',           'songs'),
  ('songs:delete',       'Excluir músicas',                       'songs'),
  -- Repertories
  ('repertories:create', 'Criar repertórios',                     'repertories'),
  ('repertories:edit:own','Editar próprios repertórios',          'repertories'),
  ('repertories:edit:any','Editar qualquer repertório',           'repertories'),
  ('repertories:share',  'Compartilhar repertórios',              'repertories'),
  ('repertories:print',  'Imprimir e exportar PDF',               'repertories'),
  -- Categories
  ('categories:view',    'Visualizar categorias',                 'categories'),
  ('categories:create',  'Criar categorias',                      'categories'),
  ('categories:edit',    'Editar categorias',                     'categories'),
  ('categories:delete',  'Excluir categorias personalizadas',     'categories'),
  -- Users
  ('users:view',         'Ver lista de usuários',                 'users'),
  ('users:promote',      'Promover usuários de nível',            'users'),
  ('users:edit',         'Editar dados de usuários',              'users'),
  ('users:delete',       'Excluir usuários',                      'users'),
  -- Admin
  ('admin:settings',     'Acessar configurações globais',         'admin'),
  ('admin:audit',        'Acessar logs de auditoria',             'admin')
ON CONFLICT (code) DO NOTHING;

-- ─── Role ↔ Permission mapping ────────────────────────────────
-- Padrão (level 1)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'padrao'
  AND p.code IN (
    'songs:view',
    'repertories:create', 'repertories:edit:own', 'repertories:share', 'repertories:print',
    'categories:view'
  )
ON CONFLICT DO NOTHING;

-- Intermediário (level 2)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'intermediario'
  AND p.code IN (
    'songs:view', 'songs:create', 'songs:edit:own',
    'repertories:create', 'repertories:edit:own', 'repertories:share', 'repertories:print',
    'categories:view'
  )
ON CONFLICT DO NOTHING;

-- Master (level 3)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'master'
  AND p.code IN (
    'songs:view', 'songs:create', 'songs:edit:own', 'songs:approve', 'songs:delete',
    'repertories:create', 'repertories:edit:own', 'repertories:edit:any', 'repertories:share', 'repertories:print',
    'categories:view', 'categories:create', 'categories:edit', 'categories:delete',
    'users:view', 'users:promote', 'users:edit', 'users:delete'
  )
ON CONFLICT DO NOTHING;

-- Administrador (level 4) — all permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'administrador'
ON CONFLICT DO NOTHING;

-- ─── Liturgical Categories (Nativas) ─────────────────────────
INSERT INTO public.liturgical_categories (name, slug, is_native, sort_order) VALUES
  ('Canto de Entrada',          'entrada',            true,  1),
  ('Ato Penitencial',           'ato-penitencial',    true,  2),
  ('Glória',                    'gloria',             true,  3),
  ('Salmo Responsorial',        'salmo',              true,  4),
  ('Aclamação ao Evangelho',    'aclamacao-evangelho',true,  5),
  ('Ofertório',                 'ofertorio',          true,  6),
  ('Santo',                     'santo',              true,  7),
  ('Cordeiro de Deus',          'cordeiro',           true,  8),
  ('Comunhão',                  'comunhao',           true,  9),
  ('Pós-Comunhão',              'pos-comunhao',       true, 10),
  ('Canto Final',               'final',              true, 11),
  ('Mariana',                   'mariana',            true, 12),
  ('Espírito Santo',            'espirito-santo',     true, 13),
  ('Adoração',                  'adoracao',           true, 14),
  ('Grupo de Oração',           'grupo-oracao',       true, 15),
  ('Louvor',                    'louvor',             true, 16)
ON CONFLICT (slug) DO NOTHING;

-- ─── Done ─────────────────────────────────────────────────────
DO $$ BEGIN
  RAISE NOTICE 'Seed concluído: roles, permissions, role_permissions e categories inseridos.';
END $$;
