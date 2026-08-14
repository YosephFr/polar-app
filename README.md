# Polar

Polar is an open-source, family-centered companion for everyday type 1 diabetes routines. It helps households record glucose and carbohydrates, apply a configured care plan, keep a shared history, and coordinate the people who support the same person.

The product is designed as a mobile-first Progressive Web App with a calm, approachable interface that works well for children, parents, caregivers, and clinicians.

## Principles

- One monitored person can be supported by several trusted accounts.
- One account can manage more than one person.
- Calculations remain traceable to the configured care-plan version.
- Recommended and administered insulin are stored as separate facts.
- Low-glucose states stop the calculation flow instead of producing a dose.
- Progress celebrates safe habits and consistent logging, not glucose outcomes.
- Private health information is never part of the source repository.

## Stack

- Next.js App Router and React
- TypeScript and Tailwind CSS
- MySQL
- Serwist service worker and installable PWA manifest
- Docker Compose for the persistent local environment
- GitHub Actions for checks and reproducible deployment

## Local development

Copy the example environment file and start the persistent stack:

```bash
cp .env.example .env
docker compose up -d --build
```

The app is available at [http://localhost:4310](http://localhost:4310). MySQL is exposed only on `127.0.0.1:33063` for local development.

Useful commands:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run db:migrate
```

## Deployment

The production build uses the Next.js standalone server. Database migrations run automatically before the application starts. A signed GitHub push webhook can call `/api/deploy`; the deployment script then updates `main`, runs the complete verification suite, builds the application, and requests a graceful Passenger restart.

Required production environment variables are listed in `.env.example`. Keep database credentials, the deployment webhook secret, and personal health information outside the repository.

`NEXT_PUBLIC_POLAR_TIME_ZONE` defines the shared display time zone used for records and appointments. Configure it for the monitored person's location so every caregiver sees the same calendar day and time.

## Safety boundary

Polar records and applies parameters entered from an individual care plan. It does not diagnose, prescribe treatment, or replace guidance from a diabetes care team. Urgent symptoms or severe glucose events require the person's established emergency plan and appropriate medical assistance.

## Contributing

Issues and pull requests are welcome. Contributions should preserve the safety boundary, protect personal data, keep the interface accessible on small screens, and include tests for any calculation or data-contract change.

## License

[MIT](LICENSE)
