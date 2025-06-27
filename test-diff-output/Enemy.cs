using UnityEngine;
using System.Collections;

public class Enemy : MonoBehaviour
{
    
    void Start()
    {
    public float maxHealth = 150f;
    public float health = 150f;
    public float damage = 15f;
    public float attackSpeed = 1.5f;
{
    public float health = 100f;
    public float damage = 10f;
    
    void Start()
    {
        StartCoroutine(AttackRoutine());
    }
    
    IEnumerator AttackRoutine()
    {
        while (health > 0)
        {
            Attack();
        }
    }
            yield return new WaitForSeconds(attackSpeed);
        while (health > 0)
        {
            yield return new WaitForSeconds(2f);
            Attack();
        }
    }
    
    void Attack()
    {
        Debug.Log("Enemy attacks!");
    }
    
    public void TakeDamage(float amount)
        // TODO: Implement actual attack logic
    void Attack()
    {
        Debug.Log("Enemy attacks!");
    }
    
    public void TakeDamage(float amount)
    {
        health -= amount;
        if (health <= 0)
        {
            Die();
        }
    }
    
    void Die()
    {
        Destroy(gameObject);
    }
}
        Debug.Log($"Enemy died! Max health was: {maxHealth}");
        DropLoot();
    
    void DropLoot()
    {
        Debug.Log("Dropping loot...");
    }
    void Die()
    {
        Debug.Log("Enemy died");
        Destroy(gameObject);
    }
}