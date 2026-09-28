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
      Connection: {
        type: 'object',
        description: 'Returned so the owning user can connect directly to this DB target. Only ever returned to the connection\'s own USER_ID; serve this API over HTTPS only.',
        properties: {
          SITE: { type: 'string' },
          IP: { type: 'string' },
          PORT: { type: 'string' },
          SERVICE_NAME: { type: 'string' },
          USER_NAME: { type: 'string' },
          PASSWORD: { type: 'string' },
          USER_ID: { type: 'integer', nullable: true },
        },
      },
      ConnectionCreateRequest: {
        type: 'object',
        required: ['site'],
        properties: {
          site: { type: 'string' },
          ip: { type: 'string' },
          port: { type: 'string' },
          serviceName: { type: 'string' },
          userName: { type: 'string' },
          password: { type: 'string' },
        },
      },
      ConnectionUpdateRequest: {
        type: 'object',
        properties: {
          ip: { type: 'string' },
          port: { type: 'string' },
          serviceName: { type: 'string' },
          userName: { type: 'string' },
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
        summary: 'List all connections',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Connection' } } } } },
          401: { description: 'Unauthorized' },
        },
      },
      post: {
        tags: ['Connections'],
        summary: 'Create a connection',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ConnectionCreateRequest' } } } },
        responses: { 201: { description: 'Created' }, 400: { description: 'Missing site' }, 401: { description: 'Unauthorized' }, 409: { description: 'A connection with this site already exists' } },
      },
    },
    '/connections/{site}': {
      get: {
        tags: ['Connections'],
        summary: 'Get a connection by site',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'site', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Connection' } } } },
          404: { description: 'Not found' },
        },
      },
      put: {
        tags: ['Connections'],
        summary: 'Update a connection',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'site', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ConnectionUpdateRequest' } } } },
        responses: { 200: { description: 'Updated' }, 404: { description: 'Not found' } },
      },
      delete: {
        tags: ['Connections'],
        summary: 'Delete a connection',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'site', in: 'path', required: true, schema: { type: 'string' } }],
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
  },
};

module.exports = swaggerSpec;
