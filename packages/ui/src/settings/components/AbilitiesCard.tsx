import { Card, CardBody, CardHeader } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import styles from './AbilitiesCard.module.css';

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
        <div className={`wordforge-abilities-grid ${styles.grid}`}>
          {Object.entries(abilities).map(([group, groupAbilities]) => (
            <div key={group} className="wordforge-ability-group">
              <h3 className={styles.groupTitle}>
                {group}
                {group === 'WooCommerce' && !wooCommerceActive && (
                  <span className={styles.inactiveBadge}>
                    {__('Inactive', 'wordforge')}
                  </span>
                )}
              </h3>
              <ul className={styles.list}>
                {groupAbilities.map((ability) => (
                  <li key={ability.name} className={styles.listItem}>
                    <code className={styles.abilityName}>{ability.name}</code>
                    <span className={styles.abilityDescription}>
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
