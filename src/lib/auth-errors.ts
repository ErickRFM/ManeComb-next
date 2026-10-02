const AUTH_MESSAGES:Record<string,string>={
  UNAUTHORIZED:"Correo o contraseña incorrectos.",
  RATE_LIMITED:"Demasiados intentos. Espera unos minutos antes de volver a intentar.",
  RATE_LIMIT_UNAVAILABLE:"El servicio de acceso no está disponible temporalmente. Intenta nuevamente en unos momentos.",
  FORBIDDEN:"Tu cuenta no tiene permiso para realizar esta operación.",
  ACCOUNT_DISABLED:"Tu cuenta está desactivada. Contacta al administrador de tu empresa.",
  DATABASE_UNAVAILABLE:"El servicio de acceso no está disponible temporalmente."
};

export function authErrorMessage(data:unknown,fallback="No fue posible completar la operación"){
  if(!data||typeof data!=="object")return fallback;
  const value=data as {error?:unknown;message?:unknown};
  if(typeof value.message==="string"&&value.message.trim())return value.message;
  if(typeof value.error==="string")return AUTH_MESSAGES[value.error]||fallback;
  return fallback;
}
