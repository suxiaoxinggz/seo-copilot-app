
import React, { useRef, useEffect } from 'react';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
    isIndeterminate?: boolean;
}

const Checkbox: React.FC<CheckboxProps> = ({ isIndeterminate = false, ...props }) => {
    const ref = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (ref.current) {
            ref.current.indeterminate = isIndeterminate;
        }
    }, [isIndeterminate]);

    return (
        <input
            type="checkbox"
            ref={ref}
            className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
            {...props}
        />
    );
};

export default Checkbox;
