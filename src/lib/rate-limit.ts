import prisma from "./prisma";

export async function checkRateLimit(identifier: string) {
  const now = new Date();
  
  const attempt = await prisma.loginAttempt.findUnique({
    where: { identifier },
  });

  if (attempt && attempt.lockedUntil && attempt.lockedUntil > now) {
    const minutesLeft = Math.ceil((attempt.lockedUntil.getTime() - now.getTime()) / 60000);
    return { allowed: false, minutesLeft };
  }

  return { allowed: true, minutesLeft: 0 };
}

export async function recordFailedAttempt(identifier: string) {
  const now = new Date();
  
  let attempt = await prisma.loginAttempt.findUnique({
    where: { identifier },
  });

  if (!attempt) {
    await prisma.loginAttempt.create({
      data: {
        identifier,
        attempts: 1,
      },
    });
    return;
  }

  // If the last update was more than 1 minute ago and no active lock, reset attempts
  const minutesSinceLastUpdate = (now.getTime() - attempt.updatedAt.getTime()) / 60000;
  
  // If we had no lock, and 1 min passed, reset to 1. Else increment.
  let newAttempts = 1;
  if (!attempt.lockedUntil || attempt.lockedUntil < now) {
      if (minutesSinceLastUpdate > 1) {
          newAttempts = 1;
      } else {
          newAttempts = attempt.attempts + 1;
      }
  } else {
      // should theoretically not hit here if checkRateLimit is called first, 
      // but just in case
      newAttempts = attempt.attempts + 1;
  }
  
  let lockMinutes = 0;
  if (newAttempts === 3) lockMinutes = 1;
  else if (newAttempts === 4) lockMinutes = 2;
  else if (newAttempts >= 5) lockMinutes = 5;

  let lockedUntil = null;
  if (lockMinutes > 0) {
    lockedUntil = new Date(now.getTime() + lockMinutes * 60000);
  }

  await prisma.loginAttempt.update({
    where: { identifier },
    data: {
      attempts: newAttempts,
      lockedUntil,
    },
  });
}

export async function clearRateLimit(identifier: string) {
  try {
    await prisma.loginAttempt.delete({
      where: { identifier },
    });
  } catch (e) {
    // Ignore if not found
  }
}
