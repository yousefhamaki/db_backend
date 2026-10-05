const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'db_app API',
    version: '1.0.0',
    description: 'Auth, connections and devices API backed by the Exsys Oracle DB.',
  },
  servers: [{ url: '/api' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { error: { type: 'string' } },
      },
      SignupRequest: {
        type: 'object',
        required: ['userName', 'password'],
        properties: {
          userName: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', format: 'password', example: 'strongPassword123' },
          fullName: { type: 'string', example: 'Jane Doe' },
          mobile: { type: 'string', example: '+201000000000' },
          country: { type: 'string', example: 'EG' },
        },
      },
      SignupResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          userId: { type: 'integer' },
          verificationToken: {
            type: 'string',
            description: 'Dev-only: returned because no email provider is wired up yet. Remove once real email delivery is added.',
          },
        },
      },
      VerifyEmailRequest: {
        type: 'object',
        required: ['token'],
        properties: { token: { type: 'string' } },
      },
      LoginRequest: {
        type: 'object',
        required: ['userName', 'password'],
        properties: {
          userName: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          user: {
            type: 'object',
            properties: {
              userId: { type: 'integer' },
              userName: { type: 'string' },
              fullName: { type: 'string' },
            },
          },
        },
      },
      RefreshRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string' } },
      },
      RefreshResponse: {
        type: 'object',
        properties: { accessToken: { type: 'string' }, refreshToken: { type: 'string' } },
      },
      LogoutRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string' } },
      },
      Credential: {
        type: 'object',
        description: 'One username/password pair for a site. Returned so the owning user can connect directly; serve this API over HTTPS only.',
        properties: {
          credentialId: { type: 'integer' },
          username: { type: 'string' },
          password: { type: 'string', nullable: true },
        },
      },
      Connection: {
        type: 'object',
        description: 'A site (IP / port / service name) with all of its credentials. Only ever returned to the owning user.',
        properties: {
          connectionId: { type: 'integer' },
          site: { type: 'string' },
          ip: { type: 'string' },
          port: { type: 'string' },
          service_name: { type: 'string' },
          data: { type: 'array', items: { $ref: '#/components/schemas/Credential' } },
        },
      },
      CredentialInput: {
        type: 'object',
        required: ['username'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' },
        },
      },
      ConnectionCreateRequest: {
        type: 'object',
        required: ['site'],
        properties: {
          site: { type: 'string', description: 'If you already have a site with this name, the credentials are added to it (ip / port / service name must match or be omitted)' },
          ip: { type: 'string' },
          port: { type: 'string' },
          serviceName: { type: 'string' },
          data: {
            type: 'array',
            description: 'Optional credentials to create together with the site',
            items: { $ref: '#/components/schemas/CredentialInput' },
          },
          userName: { type: 'string', description: 'Shorthand for a single credential (use with password)' },
          password: { type: 'string' },
        },
      },
      ConnectionUpdateRequest: {
        type: 'object',
        description: 'Site fields only. Change credentials through the /credentials endpoints.',
        properties: {
          site: { type: 'string' },
          ip: { type: 'string' },
          port: { type: 'string' },
          serviceName: { type: 'string' },
        },
      },
      CredentialUpdateRequest: {
        type: 'object',
        properties: {
          username: { type: 'string' },
          password: { type: 'string' },
        },
      },
      Device: {
        type: 'object',
        properties: {
          DEVICE_ID: { type: 'integer' },
          DEVICE_NAME: { type: 'string', nullable: true },
          DEVICE_IDENTIFIER: { type: 'string' },
          PLATFORM: { type: 'string', nullable: true },
          REGISTERED_AT: { type: 'string', format: 'date-time' },
          LAST_SEEN: { type: 'string', format: 'date-time', nullable: true },
          STATUS: { type: 'string', example: 'ACTIVE' },
        },
      },
      DeviceCreateRequest: {
        type: 'object',
        required: ['deviceIdentifier'],
        properties: {
          deviceIdentifier: { type: 'string' },
          deviceName: { type: 'string' },
          platform: { type: 'string', example: 'android' },
        },
      },
      DeviceUpdateRequest: {
        type: 'object',
        properties: {
          deviceName: { type: 'string' },
          status: { type: 'string', example: 'ACTIVE' },
          lastSeen: { type: 'boolean', description: 'Pass true to stamp LAST_SEEN = now' },
        },
      },
      UserPreferences: {
        type: 'object',
        properties: {
          appearance: { type: 'string', enum: ['light', 'dark'] },
          accentColor: { type: 'string', example: 'blue' },
          contentLayoutMode: { type: 'string', enum: ['grid', 'list'] },
          fontSize: { type: 'string', enum: ['small', 'medium', 'large'] },
          rowsPerPage: { type: 'integer', example: 50 },
          confirmBeforeDelete: { type: 'boolean' },
          useMonospacedData: { type: 'boolean' },
          showRowSeparators: { type: 'boolean' },
          useBoldText: { type: 'boolean' },
        },
      },
      UserPreferencesUpdateRequest: {
        type: 'object',
        description: 'All fields optional — only the fields you send are changed, the rest are left as-is.',
        properties: {
          appearance: { type: 'string', enum: ['light', 'dark'] },
          accentColor: { type: 'string', example: 'blue' },
          contentLayoutMode: { type: 'string', enum: ['grid', 'list'] },
          fontSize: { type: 'string', enum: ['small', 'medium', 'large'] },
          rowsPerPage: { type: 'integer', example: 50 },
          confirmBeforeDelete: { type: 'boolean' },
          useMonospacedData: { type: 'boolean' },
          showRowSeparators: { type: 'boolean' },
          useBoldText: { type: 'boolean' },
        },
      },
    },
  },
  paths: {
    '/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: 'Create a new user account (unverified)',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SignupRequest' } } } },
        responses: {
          201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/SignupResponse' } } } },
          400: { description: 'Missing fields', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'User already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/verify-email': {
      post: {
        tags: ['Auth'],
        summary: 'Verify a user\'s email with the token issued at signup',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/VerifyEmailRequest' } } } },
        responses: {
          200: { description: 'Verified' },
          400: { description: 'Invalid or expired token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in and receive an access + refresh token',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
          401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Email not verified', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Exchange a refresh token for a new access + refresh token (rotates)',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshRequest' } } } },
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshResponse' } } } },
          401: { description: 'Invalid or expired refresh token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke a refresh token',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LogoutRequest' } } } },
        responses: { 200: { description: 'OK' } },
      },
    },
    '/connections': {
      get: {
        tags: ['Connections'],
        summary: 'List your connections (each site with all of its credentials)',
        description: '`/connections/by-site` is an alias of this endpoint.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'site', in: 'query', required: false, schema: { type: 'string' }, description: 'Optional site name to filter by (case-insensitive)' },
        ],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Connection' } } } } },
          401: { description: 'Unauthorized' },
        },
      },
      post: {
        tags: ['Connections'],
        summary: 'Create a connection, or add credentials to one you already have',
        description: 'If you already have a site with this name (case-insensitive) and the ip / port / service name you send match it (or are omitted), the credentials are added to that existing site and `200` is returned. Otherwise a new site is created and `201` is returned.',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ConnectionCreateRequest' } } } },
        responses: {
          200: { description: 'Site already existed: credentials were added to it', content: { 'application/json': { schema: { $ref: '#/components/schemas/Connection' } } } },
          201: { description: 'New site created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Connection' } } } },
          400: { description: 'Missing site, or a credential without a username' },
          401: { description: 'Unauthorized' },
          409: { description: 'Site exists with a different ip / port / service name, site exists and no credentials were sent, or a username already exists on the site' },
        },
      },
    },
    '/connections/by-site/{site}': {
      get: {
        tags: ['Connections'],
        summary: 'Get a connection by site name',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'site', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Connection' } } } },
          404: { description: 'Not found' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/connections/{id}': {
      get: {
        tags: ['Connections'],
        summary: 'Get a connection by id',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Connection' } } } },
          404: { description: 'Not found' },
        },
      },
      put: {
        tags: ['Connections'],
        summary: 'Update a connection\'s site fields (not its credentials)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ConnectionUpdateRequest' } } } },
        responses: {
          200: { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Connection' } } } },
          400: { description: 'No fields to update, or credential fields sent here' },
          404: { description: 'Not found' },
          409: { description: 'You already have a connection with that site name' },
        },
      },
      delete: {
        tags: ['Connections'],
        summary: 'Delete a connection and all of its credentials',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 204: { description: 'Deleted' }, 404: { description: 'Not found' } },
      },
    },
    '/connections/{id}/credentials': {
      post: {
        tags: ['Connections'],
        summary: 'Add a username/password to a connection',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CredentialInput' } } } },
        responses: {
          201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Credential' } } } },
          400: { description: 'username is required' },
          404: { description: 'Connection not found' },
          409: { description: 'This site already has a credential with that username' },
        },
      },
    },
    '/connections/{id}/credentials/{credentialId}': {
      put: {
        tags: ['Connections'],
        summary: 'Update a credential',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'credentialId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CredentialUpdateRequest' } } } },
        responses: {
          200: { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Credential' } } } },
          400: { description: 'No fields to update, or empty username' },
          404: { description: 'Not found' },
          409: { description: 'This site already has a credential with that username' },
        },
      },
      delete: {
        tags: ['Connections'],
        summary: 'Delete a credential',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'credentialId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: { 204: { description: 'Deleted' }, 404: { description: 'Not found' } },
      },
    },
    '/devices': {
      get: {
        tags: ['Devices'],
        summary: 'List the current user\'s devices',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Device' } } } } },
        },
      },
      post: {
        tags: ['Devices'],
        summary: 'Register a device (blocked if the user has no active plan or is at their plan\'s device limit)',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/DeviceCreateRequest' } } } },
        responses: {
          201: { description: 'Registered' },
          400: { description: 'Missing deviceIdentifier' },
          403: { description: 'No active plan, or device limit reached' },
          409: { description: 'Device already registered for this user' },
        },
      },
    },
    '/devices/{id}': {
      get: {
        tags: ['Devices'],
        summary: 'Get a device by id',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Device' } } } },
          404: { description: 'Not found' },
        },
      },
      put: {
        tags: ['Devices'],
        summary: 'Update a device (rename, change status, stamp last seen)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/DeviceUpdateRequest' } } } },
        responses: { 200: { description: 'Updated' }, 404: { description: 'Not found' } },
      },
      delete: {
        tags: ['Devices'],
        summary: 'Unregister a device',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 204: { description: 'Deleted' }, 404: { description: 'Not found' } },
      },
    },
    '/preferences': {
      get: {
        tags: ['Preferences'],
        summary: 'Get the current user\'s UI preferences (defaults if never saved)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserPreferences' } } } },
        },
      },
      put: {
        tags: ['Preferences'],
        summary: 'Update the current user\'s UI preferences (partial update, upserts)',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UserPreferencesUpdateRequest' } } } },
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserPreferences' } } } },
          400: { description: 'Invalid field value' },
        },
      },
    },
  },
};

module.exports = swaggerSpec;
