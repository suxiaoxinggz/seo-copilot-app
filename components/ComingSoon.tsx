
import React from 'react';

const ComingSoon: React.FC<{ featureName: string }> = ({ featureName }) => (
  <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-8">
    <div className="bg-gray-800 p-10 rounded-2xl shadow-2xl border border-gray-700">
        <h1 className="text-4xl font-bold text-gray-300">{featureName}</h1>
        <p className="mt-4 text-xl text-teal-400">Coming Soon!</p>
        <p className="mt-2 text-base text-gray-400">This feature is currently under development and will be available in a future update.</p>
    </div>
  </div>
);

export default ComingSoon;
