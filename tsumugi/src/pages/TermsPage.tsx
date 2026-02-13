import { FileText } from 'lucide-react';
import { Breadcrumb } from '../components/common';

export function TermsPage() {
  return (
    <div className="flex-1 bg-background">
      {/* Breadcrumb */}
      <div className="max-w-4xl mx-auto px-4 pt-8">
        <Breadcrumb items={[{ label: '利用規約' }]} />
      </div>

      {/* Header */}
      <div className="bg-gradient-to-b from-primary/5 to-transparent py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-secondary" />
            <FileText className="w-6 h-6 text-secondary" />
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-secondary" />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-semibold text-foreground mb-3">
            利用規約
          </h1>
          <p className="text-muted">最終更新日: 2024年1月1日</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="prose prose-lg max-w-none">
          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold text-foreground mb-4">第1条（適用）</h2>
            <div className="text-muted leading-relaxed space-y-3">
              <p>
                本規約は、藝術贈物（以下「当社」といいます）が提供するサービス（以下「本サービス」といいます）の利用条件を定めるものです。
                登録ユーザーの皆さま（以下「ユーザー」といいます）には、本規約に従って本サービスをご利用いただきます。
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold text-foreground mb-4">第2条（利用登録）</h2>
            <div className="text-muted leading-relaxed space-y-3">
              <p>
                本サービスにおいては、登録希望者が本規約に同意の上、当社の定める方法によって利用登録を申請し、
                当社がこの承認を登録希望者に通知することによって、利用登録が完了するものとします。
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold text-foreground mb-4">第3条（禁止事項）</h2>
            <div className="text-muted leading-relaxed space-y-3">
              <p>ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>法令または公序良俗に違反する行為</li>
                <li>犯罪行為に関連する行為</li>
                <li>当社のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為</li>
                <li>当社のサービスの運営を妨害するおそれのある行為</li>
                <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
                <li>他のユーザーに成りすます行為</li>
                <li>当社のサービスに関連して、反社会的勢力に対して直接または間接に利益を供与する行為</li>
                <li>その他、当社が不適切と判断する行為</li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold text-foreground mb-4">第4条（本サービスの提供の停止等）</h2>
            <div className="text-muted leading-relaxed space-y-3">
              <p>
                当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>本サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
                <li>地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合</li>
                <li>コンピュータまたは通信回線等が事故により停止した場合</li>
                <li>その他、当社が本サービスの提供が困難と判断した場合</li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold text-foreground mb-4">第5条（著作権）</h2>
            <div className="text-muted leading-relaxed space-y-3">
              <p>
                ユーザーは、自ら著作権等の必要な知的財産権を有するか、または必要な権利者の許諾を得た文章、画像等の情報のみ、本サービスを利用して投稿することができるものとします。
              </p>
              <p>
                本サービスを通じて生成された肖像画の著作権は、生成完了時点でユーザーに帰属するものとします。
                ただし、当社は、本サービスの宣伝・広告目的で、生成された肖像画を使用する権利を有するものとします。
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold text-foreground mb-4">第6条（免責事項）</h2>
            <div className="text-muted leading-relaxed space-y-3">
              <p>
                当社の債務不履行責任は、当社の故意または重過失によらない場合には免責されるものとします。
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold text-foreground mb-4">第7条（サービス内容の変更等）</h2>
            <div className="text-muted leading-relaxed space-y-3">
              <p>
                当社は、ユーザーに通知することなく、本サービスの内容を変更しまたは本サービスの提供を中止することができるものとし、
                これによってユーザーに生じた損害について一切の責任を負いません。
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold text-foreground mb-4">第8条（利用規約の変更）</h2>
            <div className="text-muted leading-relaxed space-y-3">
              <p>
                当社は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold text-foreground mb-4">第9条（準拠法・裁判管轄）</h2>
            <div className="text-muted leading-relaxed space-y-3">
              <p>
                本規約の解釈にあたっては、日本法を準拠法とします。
                本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
