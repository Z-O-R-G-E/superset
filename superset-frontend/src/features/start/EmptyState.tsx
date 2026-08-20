import { EmptyState as EmptyStateComponent } from '@superset-ui/core/components';
import { t } from '@apache-superset/core/translation';
import { styled } from '@apache-superset/core/theme';

const EmptyContainer = styled.div`
  min-height: 200px;
  display: flex;
  color: ${({ theme }) => theme.colorTextDescription};
  flex-direction: column;
  justify-content: space-around;
`;

interface EmptyStateProps {
  favorite?: boolean;
}

function EmptyState({ favorite = false }: EmptyStateProps) {
  return (
    <EmptyContainer>
      <EmptyStateComponent
        image={favorite ? 'star-circle.svg' : 'empty-dashboard.svg'}
        size="large"
        description={t('Nothing here yet')}
      />
    </EmptyContainer>
  );
}

export default EmptyState;
