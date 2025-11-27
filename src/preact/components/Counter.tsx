import { useState } from "preact/hooks";

export function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div class="mx-3 flex items-center">
      <span className="text-2xl font-bold text-pink-400">Preact 组件挂载:</span>
      <div className="flex items-center justify-center space-x-3 px-2.5">
        <p className="text-2xl font-bold text-pink-400">Count: {count}</p>
        <button onClick={() => setCount(count + 1)} className="btn btn-neutral">
          Add
        </button>
      </div>
    </div>
  );
}
