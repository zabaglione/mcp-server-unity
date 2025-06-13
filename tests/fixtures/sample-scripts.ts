export const SampleScripts = {
  playerController: `using UnityEngine;

public class PlayerController : MonoBehaviour
{
    public float speed = 5.0f;
    public float jumpHeight = 2.0f;
    
    private Rigidbody rb;
    
    void Start()
    {
        rb = GetComponent<Rigidbody>();
    }
    
    void Update()
    {
        float horizontal = Input.GetAxis("Horizontal");
        float vertical = Input.GetAxis("Vertical");
        
        Vector3 movement = new Vector3(horizontal, 0, vertical);
        transform.Translate(movement * speed * Time.deltaTime);
        
        if (Input.GetButtonDown("Jump"))
        {
            rb.AddForce(Vector3.up * jumpHeight, ForceMode.Impulse);
        }
    }
}`,

  enemyAI: `using UnityEngine;
using UnityEngine.AI;

namespace Game.AI
{
    public class EnemyAI : MonoBehaviour
    {
        public Transform target;
        public float detectionRange = 10f;
        public float attackRange = 2f;
        
        private NavMeshAgent agent;
        private float distanceToTarget;
        
        void Start()
        {
            agent = GetComponent<NavMeshAgent>();
        }
        
        void Update()
        {
            if (target != null)
            {
                distanceToTarget = Vector3.Distance(transform.position, target.position);
                
                if (distanceToTarget <= detectionRange)
                {
                    agent.SetDestination(target.position);
                    
                    if (distanceToTarget <= attackRange)
                    {
                        Attack();
                    }
                }
            }
        }
        
        void Attack()
        {
            // Attack logic here
            Debug.Log("Enemy attacking!");
        }
    }
}`,

  gameManager: `using UnityEngine;
using System.Collections;

public class GameManager : MonoBehaviour
{
    private static GameManager instance;
    
    public static GameManager Instance
    {
        get
        {
            if (instance == null)
            {
                instance = FindObjectOfType<GameManager>();
                if (instance == null)
                {
                    GameObject go = new GameObject("GameManager");
                    instance = go.AddComponent<GameManager>();
                }
            }
            return instance;
        }
    }
    
    void Awake()
    {
        if (instance != null && instance != this)
        {
            Destroy(gameObject);
            return;
        }
        
        instance = this;
        DontDestroyOnLoad(gameObject);
    }
}`,

  invalidScript: `using UnityEngine;

// This script has compilation errors
public class InvalidScript : MonoBehaviour
{
    void Start()
    {
        // Missing semicolon
        Debug.Log("Hello")
        
        // Undefined variable
        nonExistentVariable = 5;
    }
    
    // Missing return type
    GetValue()
    {
        return 42;
    }
}`
};