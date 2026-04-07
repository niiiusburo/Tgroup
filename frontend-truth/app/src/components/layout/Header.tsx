import { motion } from 'framer-motion';
import { Sparkles, Bell, LayoutGrid } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { fadeIn, ANIMATION } from '@/lib/animation';

export interface HeaderProps {
  title?: string;
}

export function Header({ title = 'Dashboard' }: HeaderProps) {
  return (
    <motion.header
      className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-40"
      initial={fadeIn.initial}
      animate={fadeIn.animate}
      transition={{ ...fadeIn.transition, delay: 0.1 }}
    >
      {/* Title */}
      <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
        {title}
      </h1>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        {/* Icons */}
        <motion.button
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors duration-150"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Sparkles className="w-5 h-5 text-gray-500" />
        </motion.button>

        <motion.button
          className="relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors duration-150"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Bell className="w-5 h-5 text-gray-500" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
        </motion.button>

        {/* Avatars */}
        <div className="flex -space-x-2">
          {[
            { name: 'JD', color: 'bg-blue-500' },
            { name: 'AS', color: 'bg-green-500' },
            { name: 'MK', color: 'bg-purple-500' },
          ].map((avatar, index) => (
            <motion.div
              key={avatar.name}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              whileHover={{ scale: 1.1, zIndex: 10 }}
            >
              <Avatar className={`w-8 h-8 border-2 border-white ${avatar.color}`}>
                <AvatarFallback className="text-xs text-white font-medium">
                  {avatar.name}
                </AvatarFallback>
              </Avatar>
            </motion.div>
          ))}
        </div>

        {/* Customize Widget Button */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: ANIMATION.duration.normal }}
        >
          <Button
            variant="outline"
            className="flex items-center gap-2 text-sm font-medium text-gray-700 border-gray-200 hover:bg-gray-50"
          >
            <LayoutGrid className="w-4 h-4" />
            Customize Widget
          </Button>
        </motion.div>
      </div>
    </motion.header>
  );
}

export default Header;
