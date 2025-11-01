import { FastifyReply } from 'fastify';


/**
 * Standardized API response helper
 */
export default class APIResponse {
  /** Sends a successful response 
   * 
   * @param reply - Fastify reply object
   * @param data - Data to include in the response
   * @param message - Optional success message
   * @param statusCode - HTTP status code (default 200)
   * @return The sent reply
   */
  static success(reply: FastifyReply, data = {}, message = 'Request successful', statusCode = 200) {
    return reply.code(statusCode).send({
      success: true,
      message,
      data,
    });
  }

  /** Sends a created response
    * 
    * @param reply - Fastify reply object
    * @param message - Optional success message
    * @param data - Data to include in the response
    * @return The sent reply
    */
  static created(reply: FastifyReply, message = 'Created Successfully', data = {}) {
    return reply.code(201).send({
      success: true,
      message,
      data,
    });
  }
  
  /** Sends an error response
   *
   * @param reply - Fastify reply object
   * @param message - Optional error message
   * @param statusCode - HTTP status code (default 400)
   * @param errors - Optional validation errors
   * @return The sent reply
   */
  static error(reply: FastifyReply, message = 'Something went wrong', statusCode = 400, errors?: any) {
    const response: Record<string, any> = {
      success: false,
      message,
    };
    if (errors) response.errors = errors;
    return reply.code(statusCode).send(response);
  }

  /** Sends a not found response
   * 
   * @param reply - Fastify reply object
   * @param message - Optional not found message
   * @return The sent reply
   */
  static notFound(reply: FastifyReply, message = 'Resource not found') {
    return reply.code(404).send({
      success: false,
      message,
    });
  }
}
