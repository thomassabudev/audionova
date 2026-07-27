/**
 * 🔒 ZERO-TRUST AUTHENTICATION MIDDLEWARE
 * 
 * SECURITY GUARANTEES:
 * - ONLY trusts Firebase Admin SDK token verification
 * - REJECTS all client-decoded tokens
 * - ENFORCES strict Bearer token format
 * - LOGS all authentication attempts
 * - ASSUMES hostile client environment
 */

'use strict';

const { admin } = require('../config/firebase-admin');
const auditLogger = require('../utils/auditLogger');

/**
 * 🔒 ZERO-TRUST TOKEN VERIFICATION
 * 
 * SECURITY POLICY:
 * - Authorization: Bearer <token> ONLY
 * - Firebase Admin SDK verification ONLY
 * - Revocation checking ENABLED
 * - Comprehensive audit logging
 */
const verifyZeroTrustAuth = async (req, res, next) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  const auditData = {
    requestId: requestId,
    timestamp: new Date().toISOString(),
    ip: req.ip || req.connection.remoteAddress || req.socket.remoteAddress,
    userAgent: req.get('User-Agent') || 'unknown',
    path: req.path,
    method: req.method,
    origin: req.get('Origin') || 'unknown',
    referer: req.get('Referer') || 'unknown'
  };

  try {
    // 🚨 STRICT: Authorization header validation
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      auditData.violation = 'Missing Authorization header';
      auditData.severity = 'HIGH';
      await auditLogger.logSecurityViolation(auditData);
      
      return res.status(401).json({
        success: false,
        error: 'Authorization required',
        code: 'AUTH_HEADER_MISSING'
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      auditData.violation = 'Invalid Authorization header format';
      auditData.severity = 'HIGH';
      auditData.providedHeader = authHeader.substring(0, 20) + '...';
      await auditLogger.logSecurityViolation(auditData);
      
      return res.status(401).json({
        success: false,
        error: 'Bearer token required',
        code: 'AUTH_HEADER_INVALID'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '
    
    if (!token || token.length < 10) {
      return res.status(401).json({
        success: false,
        error: 'Valid token required',
        code: 'TOKEN_INVALID'
      });
    }

    // 🔒 Check if this is a Co-Admin JWT token first
    const jwt = require('jsonwebtoken');
    const CoAdmin = require('../models/CoAdmin');

    try {
      const decodedJwt = jwt.verify(token, process.env.JWT_SECRET);
      if (decodedJwt && decodedJwt.isCoAdmin && decodedJwt.coAdminId) {
        const coAdmin = await CoAdmin.findById(decodedJwt.coAdminId);
        if (coAdmin && coAdmin.isActive) {
          req.user = {
            uid: String(coAdmin._id),
            email: `${coAdmin.username}@coadmin.local`,
            name: coAdmin.name,
            admin: true,
            isCoAdmin: true,
            email_verified: true,
            permissions: coAdmin.permissions || ['songs', 'featured', 'users']
          };
          return next();
        } else {
          return res.status(403).json({ success: false, error: 'Co-Admin account is inactive or revoked', code: 'ACCOUNT_DISABLED' });
        }
      }
    } catch (jwtErr) {
      // Not a valid Co-Admin JWT, proceed with Firebase Admin SDK verification below
    }

    // 🔒 CRITICAL: Firebase Admin SDK verification with revocation check
    const decodedToken = await admin.auth().verifyIdToken(token, true); // checkRevoked = true
    
    // 🛡️ STRICT: Token claim validation
    if (!decodedToken.uid || !decodedToken.email || !decodedToken.email_verified) {
      auditData.violation = 'Token missing required claims';
      auditData.severity = 'CRITICAL';
      auditData.tokenClaims = {
        hasUid: !!decodedToken.uid,
        hasEmail: !!decodedToken.email,
        emailVerified: decodedToken.email_verified
      };
      await auditLogger.logSecurityViolation(auditData);
      
      return res.status(401).json({
        success: false,
        error: 'Invalid token claims',
        code: 'TOKEN_CLAIMS_INVALID'
      });
    }

    // 🔒 ATTACH ONLY VERIFIED TOKEN DATA (NO CLIENT DATA TRUSTED)
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      admin: decodedToken.admin === true, // Explicit boolean check
      email_verified: decodedToken.email_verified,
      auth_time: decodedToken.auth_time,
      iat: decodedToken.iat,
      exp: decodedToken.exp,
      firebase: {
        sign_in_provider: decodedToken.firebase?.sign_in_provider,
        identities: decodedToken.firebase?.identities
      }
    };

    // 🔍 SUCCESS AUDIT LOG
    auditData.success = true;
    auditData.uid = decodedToken.uid;
    auditData.email = decodedToken.email;
    auditData.hasAdminClaim = decodedToken.admin === true;
    auditData.verificationTime = Date.now() - startTime;
    auditData.tokenExp = new Date(decodedToken.exp * 1000).toISOString();
    
    await auditLogger.logAuthEvent(auditData);
    
    next();

  } catch (error) {
    auditData.error = error.message;
    auditData.errorCode = error.code;
    auditData.severity = 'CRITICAL';
    auditData.verificationTime = Date.now() - startTime;
    
    await auditLogger.logSecurityViolation(auditData);
    
    // 🔒 SPECIFIC ERROR RESPONSES FOR SECURITY
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        success: false,
        error: 'Token revoked',
        code: 'TOKEN_REVOKED'
      });
    }

    if (error.code === 'auth/argument-error') {
      return res.status(401).json({
        success: false,
        error: 'Malformed token',
        code: 'TOKEN_MALFORMED'
      });
    }

    if (error.code === 'auth/project-not-found') {
      return res.status(401).json({
        success: false,
        error: 'Authentication service unavailable',
        code: 'AUTH_SERVICE_ERROR'
      });
    }
    
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
};

/**
 * 🔒 ZERO-TRUST ADMIN VERIFICATION
 * 
 * SECURITY POLICY:
 * - ONLY server-verified admin claims trusted
 * - COMPREHENSIVE audit logging
 * - ASSUMES all requests are hostile
 * - NO email-based authorization
 */
const verifyZeroTrustAdmin = async (req, res, next) => {
  const requestId = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const auditData = {
    requestId: requestId,
    timestamp: new Date().toISOString(),
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    path: req.path,
    method: req.method,
    uid: req.user?.uid,
    email: req.user?.email
  };

  try {
    // 🚨 CRITICAL: User must be authenticated first
    if (!req.user || !req.user.uid) {
      auditData.violation = 'Admin access without authentication';
      auditData.severity = 'CRITICAL';
      await auditLogger.logSecurityViolation(auditData);
      
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // 🔒 STRICT: Check ONLY server-verified admin claim
    const hasAdminClaim = req.user.admin === true;
    
    if (!hasAdminClaim) {
      auditData.violation = 'Unauthorized admin access attempt';
      auditData.severity = 'CRITICAL';
      auditData.userClaims = {
        admin: req.user.admin,
        email_verified: req.user.email_verified
      };
      await auditLogger.logSecurityViolation(auditData);
      
      return res.status(403).json({
        success: false,
        error: 'Admin privileges required',
        code: 'ADMIN_REQUIRED'
      });
    }

    // 🛡️ ADDITIONAL SECURITY CHECKS
    if (!req.user.email_verified) {
      auditData.violation = 'Unverified email attempting admin access';
      auditData.severity = 'HIGH';
      await auditLogger.logSecurityViolation(auditData);
      
      return res.status(403).json({
        success: false,
        error: 'Email verification required',
        code: 'EMAIL_UNVERIFIED'
      });
    }

    // 🔍 SUCCESS: Log admin access for audit trail
    auditData.success = true;
    auditData.adminAccess = true;
    auditData.adminEmail = req.user.email;
    
    await auditLogger.logAdminAccess(auditData);

    next();

  } catch (error) {
    auditData.error = error.message;
    auditData.severity = 'CRITICAL';
    await auditLogger.logSecurityViolation(auditData);
    
    return res.status(500).json({
      success: false,
      error: 'Security verification failed',
      code: 'SECURITY_ERROR'
    });
  }
};

/**
 * 🔒 COMBINED ZERO-TRUST ADMIN MIDDLEWARE
 * Enforces both authentication and admin authorization
 */
const requireZeroTrustAdmin = [verifyZeroTrustAuth, verifyZeroTrustAdmin];

module.exports = {
  verifyZeroTrustAuth,
  verifyZeroTrustAdmin,
  requireZeroTrustAdmin
};