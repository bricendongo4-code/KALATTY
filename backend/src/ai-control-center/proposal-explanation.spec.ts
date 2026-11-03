import { explainControl } from './proposal-explanation';

describe('plain-language control explanations', () => {
  it('preserves the decision explanation within storage limits for a large set of failed checks', () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({
      source: `${i} ${'test '.repeat(100)}`,
      available: true,
      detail: 'completed/failure '.repeat(100),
    }));
    const text = explainControl(rows, [], [], rows);
    expect(text.length).toBeLessThan(4000);
    expect(text).toContain('6. Décision demandée');
  });
  it('compares measurements without presenting normal activity as a confirmed defect', () => {
    const text = explainControl(
      [{ source: 'payments', available: true, count: 7 }],
      [{ source: 'payments', available: true, count: 4 }],
      [],
      [],
    );
    expect(text).toContain('7 (avant : 4)');
    expect(text).toContain('ne prouve pas un dysfonctionnement');
    expect(text).toContain('Le changement exact restera à approuver');
  });
  it('proposes checking access when evidence is unavailable, without inventing a cause', () => {
    const rows = [{ source: 'GitHub CI', available: false }];
    const text = explainControl(rows, [], rows, []);
    expect(text).toContain('GitHub CI : source indisponible');
    expect(text).toContain('Vérifier la connexion et les droits');
    expect(text).toContain('ni établi la cause');
  });
  it('asks for investigation of a failed check rather than claiming a repair', () => {
    const rows = [
      { source: 'CI : tests', available: true, detail: 'completed/failure' },
    ];
    const text = explainControl(rows, [], [], rows);
    expect(text).toContain('completed/failure');
    expect(text).toContain('reproduire le problème');
    expect(text).toContain("Aucun code n'a été corrigé");
  });
});
