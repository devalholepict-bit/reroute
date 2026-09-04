import React from 'react';
import { Spinner } from './Spinner';

/**
 * LoadingState — Consistent, styled loading container
 */
export function LoadingState({ message = 'Loading recovery data…', minHeight = 'py-16', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${minHeight} ${className}`}>
      <Spinner size="lg" label={message} />
    </div>
  );
}
