import { Building2, User, Phone, Mail, MapPin } from 'lucide-react';
import { Breadcrumb } from '../components/common';
import { legalInfo } from '../data/legal';

export function CompanyPage() {
  return (
    <div className="flex-1 bg-background">
      <div className="max-w-4xl mx-auto px-4 pt-8">
        <Breadcrumb items={[{ label: '会社概要' }]} />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="font-serif text-3xl font-semibold text-foreground mb-8">会社概要</h1>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-xs text-muted">会社名</p>
                <p className="text-foreground font-medium">{legalInfo.販売業者}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-xs text-muted">運営責任者</p>
                <p className="text-foreground font-medium">{legalInfo.運営統括責任者}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-xs text-muted">所在地</p>
                <p className="text-foreground font-medium">{legalInfo.所在地}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-xs text-muted">電話番号</p>
                <p className="text-foreground font-medium">{legalInfo.電話番号}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-xs text-muted">メールアドレス</p>
                <p className="text-foreground font-medium">{legalInfo.メールアドレス}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
