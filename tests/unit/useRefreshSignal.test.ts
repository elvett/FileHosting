/**
 * @vitest-environment jsdom
 */
import { test, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRefreshSignal } from '@/lib/useRefreshSignal';
import { useState } from 'react';

test('useRefreshSignal should trigger a re-render when called', () => {

  const { result } = renderHook(() => {
    const [count, setCount] = useState(0);
    const trigger = useRefreshSignal(() => setCount(c => c + 1));
    return { trigger, count };
  });
  expect(result.current.count).toBe(0);


  act(() => {
    result.current.trigger();
  });

  expect(result.current.count).toBe(1);

  act(() => {
    result.current.trigger();
  });


  expect(result.current.count).toBe(2);
});



test('useRefreshSignal should remove its listener on unmount', () => {
  const mockListener1 = vi.fn();
  const mockListener2 = vi.fn();

  const { result: result1, unmount: unmount1 } = renderHook(() => 
    useRefreshSignal(mockListener1)
  );
  const trigger1 = result1.current;
  
  const { unmount: unmount2 } = renderHook(() => 
    useRefreshSignal(mockListener2)
  );

  act(() => {
    trigger1(); 
  });
  
  expect(mockListener1).toHaveBeenCalledTimes(1);
  expect(mockListener2).toHaveBeenCalledTimes(1);
  

  unmount1();
  

  act(() => {
    trigger1(); 
  });
  
  expect(mockListener1).toHaveBeenCalledTimes(1); 
  expect(mockListener2).toHaveBeenCalledTimes(2); 
  unmount2();
});