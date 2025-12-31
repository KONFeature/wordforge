import { Card, CardBody, CardHeader } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

interface AbilitiesCardProps {
  abilities: Record<string, Array<{ name: string; description: string }>>;
  wooCommerceActive: boolean;
}

export const AbilitiesCard = ({
  abilities,
  wooCommerceActive,
}: AbilitiesCardProps) => {
  return (
    <Card className="wordforge-card wordforge-card-wide">
      <CardHeader>
        <h2>{__('Available Abilities', 'wordforge')}</h2>
      </CardHeader>
      <CardBody>
        <div
          className="wordforge-abilities-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px',
          }}
        >
          {Object.entries(abilities).map(([group, groupAbilities]) => (
            <div key={group} className="wordforge-ability-group">
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  margin: '0 0 10px',
                }}
              >
                {group}
                {group === 'WooCommerce' && !wooCommerceActive && (
                  <span
                    style={{
                      marginLeft: '8px',
                      background: '#646970',
                      color: '#fff',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontSize: '11px',
                      fontWeight: 'normal',
                    }}
                  >
                    {__('Inactive', 'wordforge')}
                  </span>
                )}
              </h3>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {groupAbilities.map((ability) => (
                  <li key={ability.name} style={{ marginBottom: '8px' }}>
                    <code
                      style={{
                        background: '#f0f0f1',
                        padding: '2px 4px',
                        borderRadius: '3px',
                        fontSize: '12px',
                      }}
                    >
                      {ability.name}
                    </code>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        color: '#646970',
                        marginTop: '2px',
                      }}
                    >
                      {ability.description}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
};
