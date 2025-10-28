export const unauthorized = {
  description: 'Unauthorized',
  type: 'object',
  properties: {
    statusCode: { type: 'number', example: 401 },
    message: { type: 'string', example: 'API key is missing' }
  }
};

export const forbidden = {
  description: 'Forbidden',
  type: 'object',
  properties: {
    statusCode: { type: 'number', example: 403 },
    message: { type: 'string', example: 'Invalid API key' }
  }
};

export const internalServerError = {
  description: 'Internal Server Error',
  type: 'object',
  properties: {
    statusCode: { type: 'number', example: 500 },
    message: { type: 'string', example: 'Internal Server Error' }
  }
};

export const accepted = {
  description: 'Accepted',
  type: 'object',
  properties: {
    statusCode: { type: 'number', example: 202 },
    message: { type: 'string', example: 'Job started' }
  }
}

export function badRequest(messages: string[]) {
  return {
    description: 'Bad Request',
    type: 'object',
    items: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        error: { type: 'string', example: 'Bad Request' },
        message: {
          type: 'string',
          enum: messages
        }
      }
    },
    example: messages.map(msg => ({
      statusCode: 400,
      error: 'Bad Request',
      message: msg
    }))
  };
}

export function notFound(messages: string[]) {
  return {
    description: 'Not Found',
    type: 'object',
    items: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        error: { type: 'string', example: 'Not Found' },
        message: {
          type: 'string',
          enum: messages
        }
      }
    },
    example: messages.map(msg => ({
      statusCode: 404,
      error: 'Not Found',
      message: msg
    }))
  };
}


export const jobUpdateState = {
  type: 'object',
  description: 'Job execution state with index metadata and processing steps',
  properties: {
    status: { type: 'string', enum: ['pending', 'running', 'done', 'error'], example: 'done' },
    index: { type: 'string', example: 'holdings-2025-04-10' },
    createdAt: { type: 'string', format: 'date-time', example: '2025-04-10T08:09:54.749Z' },
    documents: { type: ['integer', 'string', 'null'], example: '2786405' },
    endAt: { type: ['string', 'null'], format: 'date-time', example: '2025-04-10T10:21:20.558Z' },
    took: { type: 'number', example: 7885.809 },
    steps: {
      type: 'array',
      description: 'List of processing steps executed during the job',
      items: {
        type: 'object',
        properties: {
          portal: { type: 'string', example: 'INSU' },
          name: { type: 'string', example: '[holdingsIQ][download]' },
          fileType: { type: 'string', example: 'STANDARD' },
          startDate: { type: 'string', format: 'date-time', example: '2025-04-10T08:09:55.720Z' },
          endDate: { type: ['string', 'null'], format: 'date-time', example: '2025-04-10T08:12:00.956Z' },
          status: { type: 'string', enum: ['done', 'error'], example: 'done' },
          lineUpserted: { type: ['integer', 'null'], example: 208279 },
        },
        required: ['portal', 'name', 'fileType', 'startDate', 'status'],
        additionalProperties: false,
      },
      examples: [
        [
          {
            portal: 'INSU',
            name: '[holdingsIQ][download]',
            fileType: 'STANDARD',
            startDate: '2025-04-10T08:09:55.720Z',
            endDate: '2025-04-10T08:12:00.956Z',
            status: 'done',
          },
          {
            portal: 'INSU',
            name: '[elastic][insert]',
            fileType: 'STANDARD',
            startDate: '2025-04-10T08:12:00.956Z',
            endDate: '2025-04-10T08:12:35.711Z',
            status: 'done',
            lineUpserted: 208279,
          },
        ],
      ],
    },
  },
  required: ['status', 'index', 'createdAt', 'steps'],
  additionalProperties: false,
};