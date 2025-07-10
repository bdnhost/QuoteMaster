const db = require('../config/database');

const activityLogger = (action, entityType = null) => {
  return async (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json;
    
    res.json = function(data) {
      // Log activity after successful response
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        setImmediate(async () => {
          try {
            let entityId = null;
            let details = {};
            
            // Extract entity ID from various sources
            if (req.params.id) entityId = req.params.id;
            else if (req.params.quoteId) entityId = req.params.quoteId;
            else if (req.params.userId) entityId = req.params.userId;
            else if (data && data.id) entityId = data.id;
            
            // Prepare details based on action
            switch (action) {
              case 'create':
                details = { created_entity: entityType, method: req.method };
                break;
              case 'update':
                details = { updated_entity: entityType, method: req.method };
                break;
              case 'delete':
                details = { deleted_entity: entityType, method: req.method };
                break;
              case 'login':
                details = { login_method: 'email_password' };
                break;
              case 'logout':
                details = { logout_time: new Date() };
                break;
              default:
                details = { action_type: action, method: req.method };
            }
            
            // Add request info
            details.url = req.originalUrl;
            if (req.body && Object.keys(req.body).length > 0) {
              // Don't log sensitive data
              const sanitizedBody = { ...req.body };
              delete sanitizedBody.password;
              delete sanitizedBody.token;
              details.request_data = sanitizedBody;
            }
            
            await db.execute(`
              INSERT INTO activity_log (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
              req.user.id,
              action,
              entityType,
              entityId,
              JSON.stringify(details),
              req.ip || req.connection.remoteAddress,
              req.get('User-Agent')
            ]);
          } catch (error) {
            console.error('Activity logging error:', error);
          }
        });
      }
      
      // Call original json method
      return originalJson.call(this, data);
    };
    
    next();
  };
};

module.exports = activityLogger;
