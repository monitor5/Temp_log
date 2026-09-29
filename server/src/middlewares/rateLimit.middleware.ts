import rateLimit from 'express-rate-limit';

// 인증 API 제한 (로그인 시도 방지)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 10, // 최대 10회 시도
  message: { 
    success: false, 
    error: '너무 많은 로그인 시도입니다. 15분 후에 다시 시도해주세요.' 
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 댓글 작성 제한
export const commentLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1분
  max: 5, // 최대 5개
  message: { 
    success: false, 
    error: '잠시 후 다시 시도해주세요.' 
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 업로드 제한
export const uploadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1분
  max: 20, // 최대 20개
  message: { 
    success: false, 
    error: '업로드 제한에 도달했습니다. 잠시 후 다시 시도해주세요.' 
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 일반 API 제한
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1분
  max: 100, // 최대 100회
  message: { 
    success: false, 
    error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.' 
  },
  standardHeaders: true,
  legacyHeaders: false
});

