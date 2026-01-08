import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, UserPlus, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signIn, signUp, signInWithGoogle } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const validateForm = () => {
    try {
      authSchema.parse({ email, password });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { email?: string; password?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0] === 'email') fieldErrors.email = err.message;
          if (err.path[0] === 'password') fieldErrors.password = err.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          let errorMessage = 'Erro ao fazer login';
          if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'Email ou senha incorretos';
          } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'Por favor, confirme seu email antes de fazer login';
          }
          toast({
            title: 'Erro de autenticação',
            description: errorMessage,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Login realizado!',
            description: 'Bem-vindo de volta.',
          });
          navigate('/');
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          let errorMessage = 'Erro ao criar conta';
          if (error.message.includes('User already registered')) {
            errorMessage = 'Este email já está cadastrado';
          } else if (error.message.includes('Password')) {
            errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres';
          }
          toast({
            title: 'Erro de cadastro',
            description: errorMessage,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Conta criada!',
            description: 'Verifique seu email para confirmar o cadastro.',
          });
        }
      }
    } catch (err) {
      toast({
        title: 'Erro inesperado',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast({
          title: 'Erro ao entrar com Google',
          description: error.message,
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Erro inesperado',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-6 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="rounded-[2.5rem] border border-border/30 shadow-2xl overflow-hidden bg-card/80 backdrop-blur-xl">
          <CardHeader className="text-center pt-10 pb-4 px-8">
            <motion.div 
              className="flex justify-center mb-6"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full" />
                <div className="relative w-20 h-20 bg-gradient-to-br from-primary via-primary to-secondary rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-primary/30">
                  <Zap size={36} className="text-primary-foreground" fill="currentColor" />
                </div>
              </div>
            </motion.div>
            
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold tracking-tight">
                {isLogin ? 'Bem-vindo de volta' : 'Criar Conta'}
              </CardTitle>
              <CardDescription className="text-muted-foreground text-base">
                {isLogin 
                  ? 'Acesse o Insight Finance Pro' 
                  : 'Comece sua jornada financeira'}
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="px-8 pb-10">
            {/* Google Sign In Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isLoading}
                className="w-full h-14 rounded-2xl font-semibold text-sm tracking-wide mb-6 border-2 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group"
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 size={20} className="mr-3 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <svg className="mr-3 w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continuar com Google
                  </>
                )}
              </Button>
            </motion.div>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/30" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-4 text-[11px] text-muted-foreground font-semibold uppercase tracking-widest">
                  ou use email
                </span>
              </div>
            </div>

            <motion.form 
              onSubmit={handleSubmit} 
              className="space-y-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="space-y-2">
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`pl-12 h-14 rounded-2xl bg-muted/30 border-border/30 focus:border-primary/50 focus:bg-background/50 transition-all duration-300 ${errors.email ? 'border-destructive' : ''}`}
                    disabled={isLoading || isGoogleLoading}
                  />
                </div>
                {errors.email && (
                  <motion.p 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-destructive text-xs pl-4 font-medium"
                  >
                    {errors.email}
                  </motion.p>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`pl-12 h-14 rounded-2xl bg-muted/30 border-border/30 focus:border-primary/50 focus:bg-background/50 transition-all duration-300 ${errors.password ? 'border-destructive' : ''}`}
                    disabled={isLoading || isGoogleLoading}
                  />
                </div>
                {errors.password && (
                  <motion.p 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-destructive text-xs pl-4 font-medium"
                  >
                    {errors.password}
                  </motion.p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full h-14 rounded-2xl font-bold text-sm tracking-wide shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all duration-300"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="mr-3 animate-spin" />
                    {isLogin ? 'Entrando...' : 'Criando conta...'}
                  </>
                ) : (
                  <>
                    {isLogin ? <LogIn size={18} className="mr-2" /> : <UserPlus size={18} className="mr-2" />}
                    {isLogin ? 'Entrar' : 'Criar Conta'}
                  </>
                )}
              </Button>
            </motion.form>

            <motion.div 
              className="mt-8 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                {isLogin ? (
                  <>Não tem conta? <span className="text-primary font-semibold">Cadastre-se</span></>
                ) : (
                  <>Já tem conta? <span className="text-primary font-semibold">Faça login</span></>
                )}
              </button>
            </motion.div>
          </CardContent>
        </Card>
        
        {/* Trust badges */}
        <motion.div 
          className="flex items-center justify-center gap-6 mt-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider">Dados seguros</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
              <Zap className="w-3 h-3 text-primary" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider">IA avançada</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Auth;
