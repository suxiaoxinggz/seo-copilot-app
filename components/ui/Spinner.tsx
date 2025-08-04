import React from 'react';

const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
    const sizeClasses = {
        sm: 'w-6 h-6',
        md: 'w-10 h-10',
        lg: 'w-16 h-16',
    };

    return (
        <div className={` ${sizeClasses[size]} border-4 border-blue-500 border-t-transparent rounded-full animate-spin`}></div>
    );
};

export default Spinner;
