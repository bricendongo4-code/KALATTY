import { InstitutionsService } from './institutions.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('Student grade privacy', () => {
  const makeService = (rows: unknown[]) => {
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: rows, error: null }),
    };
    const from = jest.fn().mockReturnValue(query);
    const service = new InstitutionsService({ client: { from } } as unknown as SupabaseService);
    return { service, query, from };
  };

  it('hides scores and feedback on unpublished grades', async () => {
    const { service, query, from } = makeService([{
      id: 'submission-1', status: 'reviewed', published: false,
      score: 18, feedback: 'Private teacher comment',
      assignments: { title: 'Math', max_score: 20, rooms: { name: 'A' } },
    }]);
    const grades = await service.getMyGrades({ id: 'student-a' });
    expect(grades).toHaveLength(1);
    expect(grades[0]).toMatchObject({ score: null, feedback: null });
    expect(query.eq).toHaveBeenCalledWith('student_id', 'student-a');
    expect(from).toHaveBeenCalledWith('assignment_submissions');
  });

  it('shows scores and feedback only after publication', async () => {
    const { service } = makeService([{
      id: 'submission-2', status: 'reviewed', published: true,
      score: 16, feedback: 'Good work',
      assignments: { title: 'History', max_score: 20, rooms: { name: 'B' } },
    }]);
    const grades = await service.getMyGrades({ id: 'student-b' });
    expect(grades[0]).toMatchObject({ score: 16, feedback: 'Good work' });
  });
});
