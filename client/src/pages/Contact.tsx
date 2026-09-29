import { site } from '@/site';
import { motion } from 'framer-motion';
import { Mail, MapPin, Phone } from 'lucide-react';

export function Contact() {
  return (
    <div className="container-narrow py-12 lg:py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        {/* 헤더 */}
        <header className="mb-16 text-center">
          <h1 className="font-serif text-display-sm lg:text-display mb-4">Contact</h1>
          <p className="text-secondary text-lg">
            프로젝트 협업이나 문의사항이 있으시면 연락해주세요.
          </p>
        </header>

        {/* 연락처 정보 */}
        <div className="space-y-8 mb-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-start gap-6 p-6 bg-surface-dark"
          >
            <div className="p-3 bg-primary text-surface">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-medium mb-1">Email</h3>
              <a
                href={site.email ? 'mailto:' + site.email : undefined}
                className="text-secondary hover:text-accent-ink transition-colors"
              >
                {site.email || '연락처를 준비하고 있습니다'}
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-start gap-6 p-6 bg-surface-dark"
          >
            <div className="p-3 bg-primary text-surface">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-medium mb-1">Location</h3>
              <p className="text-secondary">
                {site.location || '위치 미등록'}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-start gap-6 p-6 bg-surface-dark"
          >
            <div className="p-3 bg-primary text-surface">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-medium mb-1">Phone</h3>
              <a
                href={site.phone ? 'tel:' + site.phone : undefined}
                className="text-secondary hover:text-accent-ink transition-colors"
              >
                {site.phone || '전화번호 미등록'}
              </a>
            </div>
          </motion.div>
        </div>

        {/* 문의 폼 */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!site.email) return;
            const form = new FormData(e.currentTarget);
            const subject = encodeURIComponent(String(form.get('subject') || '문의'));
            const body = encodeURIComponent(String(form.get('message') || '') + '\n\n' + form.get('name') + ' / ' + form.get('email'));
            window.location.href = 'mailto:' + site.email + '?subject=' + subject + '&body=' + body;
          }}
        >
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                이름
              </label>
              <input
                type="text"
                id="name" name="name" required
                className="input-field"
                placeholder="홍길동"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                이메일
              </label>
              <input
                type="email"
                id="email" name="email" required
                className="input-field"
                placeholder="hello@example.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium mb-2">
              제목
            </label>
            <input
              type="text"
              id="subject" name="subject" required
              className="input-field"
              placeholder="문의 제목"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium mb-2">
              메시지
            </label>
            <textarea
              id="message" name="message" required
              rows={6}
              className="input-field resize-none"
              placeholder="문의 내용을 작성해주세요"
            />
          </div>

          <button type="submit" disabled={!site.email} className="btn-primary w-full disabled:opacity-40">
            {site.email ? '메일 앱에서 작성' : '연락처 등록 후 문의 가능'}
          </button>
        </motion.form>
      </motion.div>
    </div>
  );
}

