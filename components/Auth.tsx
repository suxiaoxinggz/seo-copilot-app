import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';

const Auth: React.FC = () => {
    const context = useContext(AppContext);
    const { supabase } = context || {};

    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    if (!supabase) {
        return (
             <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <Card>
                    <p className="text-center text-gray-300">Initializing...</p>
                </Card>
            </div>
        );
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setError(error.message);
        }
        setLoading(false);
    };
    
    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        const { error } = await supabase.auth.signUp({ 
            email, 
            password,
        });

        if (error) {
            setError(error.message);
        } else {
            setMessage('Registration successful! Please check your email to confirm your account.');
        }
        setLoading(false);
    };

    const handleMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');
        
        const { error } = await supabase.auth.signInWithOtp({
          email,
        });

        if (error) {
          setError(error.message);
        } else {
          setMessage('Check your email for the login link!');
        }
        setLoading(false);
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="w-full max-w-md p-4">
                 <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white">SEO Copilot</h1>
                    <p className="text-lg text-gray-400 mt-2">您的内容策略云平台</p>
                </div>
                <Card>
                    <form onSubmit={handleLogin}>
                        <div className="space-y-4">
                            <Input
                                id="email"
                                label="邮箱"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                            />
                            <Input
                                id="password"
                                label="密码"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        <div className="mt-6 space-y-2">
                             <Button type="submit" isLoading={loading} className="w-full">
                                登录
                            </Button>
                            <Button type="button" variant="secondary" onClick={handleSignup} isLoading={loading} className="w-full">
                                注册
                            </Button>
                            <Button type="button" variant="secondary" onClick={handleMagicLink} isLoading={loading} className="w-full">
                                使用魔法链接登录
                            </Button>
                        </div>
                    </form>
                    {message && <p className="mt-4 text-center text-green-400">{message}</p>}
                    {error && <p className="mt-4 text-center text-red-400">{error}</p>}
                </Card>
            </div>
        </div>
    );
};

export default Auth;