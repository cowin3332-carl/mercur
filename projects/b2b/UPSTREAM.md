# Upstream provenance

- B2B source: https://github.com/medusajs/b2b-starter
- Imported commit: `3ed7131d480ed4dbc8387bcc5f6cca606442d051`
- B2B source license: MIT, preserved in `LICENSE`
- Marketplace runtime: npm `@mercurjs/core@2.3.7` and `@mercurjs/types@2.3.7`
- Marketplace source: https://github.com/mercurjs/mercur
- Runtime is installed as a plugin. It is not a second Medusa server.

Local changes include combined configuration, explicit seed scripts, offer-based
cart adapters, creator/admin binding and resource ownership guards, dependency
repairs, strict typechecks, repeatable startup and integration CI.

The starter's automatic initial-data migration was moved to an explicit seed
script so upgrading a populated database does not silently create demo products.
